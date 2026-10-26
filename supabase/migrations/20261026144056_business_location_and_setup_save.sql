-- Business location, plus one atomic function that saves the whole setup
-- (profile, customer fields, rating questions) in a single transaction.

alter table public.businesses
  add column location text
  check (location is null or char_length(location) between 1 and 120);

-- SECURITY INVOKER: row level security still applies to the calling owner.
create or replace function public.save_business_setup(
  p_business_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  rec record;
  keep_fields uuid[];
  keep_attrs uuid[];
  touched int;
begin
  if not public.is_business_owner(p_business_id) then
    raise exception 'not_owner';
  end if;

  update public.businesses
  set name = p_payload->>'name',
      category = p_payload->>'category',
      location = p_payload->>'location',
      description = nullif(p_payload->>'description', ''),
      google_review_url = p_payload->>'google_review_url'
  where id = p_business_id;

  if not found then
    raise exception 'not_found';
  end if;

  -- ---- customer fields -------------------------------------------------
  select coalesce(array_agg((e->>'id')::uuid) filter (where e->>'id' is not null), '{}')
  into keep_fields
  from jsonb_array_elements(coalesce(p_payload->'fields', '[]'::jsonb)) e;

  update public.feedback_fields
  set is_active = false, deleted_at = now()
  where business_id = p_business_id
    and deleted_at is null
    and id <> all (keep_fields);

  -- Park labels so renames and swaps cannot trip the unique index mid-way.
  update public.feedback_fields
  set label = id::text
  where business_id = p_business_id
    and deleted_at is null;

  for rec in
    select e as item, n as pos
    from jsonb_array_elements(coalesce(p_payload->'fields', '[]'::jsonb))
      with ordinality as t(e, n)
    order by n
  loop
    if rec.item->>'id' is not null then
      update public.feedback_fields
      set label = rec.item->>'label',
          is_required = coalesce((rec.item->>'is_required')::boolean, false),
          is_active = coalesce((rec.item->>'is_active')::boolean, true),
          display_order = rec.pos
      where id = (rec.item->>'id')::uuid
        and business_id = p_business_id
        and deleted_at is null;
      get diagnostics touched = row_count;
      if touched = 0 then
        raise exception 'stale';
      end if;
    else
      insert into public.feedback_fields
        (business_id, label, is_required, is_active, display_order)
      values (
        p_business_id,
        rec.item->>'label',
        coalesce((rec.item->>'is_required')::boolean, false),
        coalesce((rec.item->>'is_active')::boolean, true),
        rec.pos
      );
    end if;
  end loop;

  -- ---- rating questions ------------------------------------------------
  select coalesce(array_agg((e->>'id')::uuid) filter (where e->>'id' is not null), '{}')
  into keep_attrs
  from jsonb_array_elements(coalesce(p_payload->'attributes', '[]'::jsonb)) e;

  update public.rating_attributes
  set is_active = false, deleted_at = now()
  where business_id = p_business_id
    and deleted_at is null
    and id <> all (keep_attrs);

  update public.rating_attributes
  set label = id::text
  where business_id = p_business_id
    and deleted_at is null;

  for rec in
    select e as item, n as pos
    from jsonb_array_elements(coalesce(p_payload->'attributes', '[]'::jsonb))
      with ordinality as t(e, n)
    order by n
  loop
    if rec.item->>'id' is not null then
      update public.rating_attributes
      set label = rec.item->>'label',
          is_active = coalesce((rec.item->>'is_active')::boolean, true),
          display_order = rec.pos
      where id = (rec.item->>'id')::uuid
        and business_id = p_business_id
        and deleted_at is null;
      get diagnostics touched = row_count;
      if touched = 0 then
        raise exception 'stale';
      end if;
    else
      insert into public.rating_attributes
        (business_id, label, is_active, display_order)
      values (
        p_business_id,
        rec.item->>'label',
        coalesce((rec.item->>'is_active')::boolean, true),
        rec.pos
      );
    end if;
  end loop;
end;
$$;

revoke all on function public.save_business_setup(uuid, jsonb) from public, anon;
grant execute on function public.save_business_setup(uuid, jsonb) to authenticated;

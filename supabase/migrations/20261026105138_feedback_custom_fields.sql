-- Owner-defined text fields shown to customers next to the star questions,
-- and the answers customers give. Answers feed the AI draft prompt.

create type public.feedback_field_input_type as enum ('short', 'long');

create table public.feedback_fields (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  input_type public.feedback_field_input_type not null default 'short',
  is_required boolean not null default false,
  is_active boolean not null default true,
  display_order integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index feedback_fields_id_business_uidx
  on public.feedback_fields (id, business_id);

create unique index feedback_fields_business_label_live_uidx
  on public.feedback_fields (business_id, label)
  where deleted_at is null;

create index feedback_fields_business_order_idx
  on public.feedback_fields (business_id, display_order);

-- label is a snapshot so history stays readable if the field is later removed.
create table public.feedback_field_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  field_id uuid,
  business_id uuid not null,
  label text not null check (char_length(label) between 1 and 80),
  value text not null check (char_length(value) between 1 and 2000),
  created_at timestamptz not null default now(),
  unique (session_id, field_id)
);

alter table public.feedback_field_answers
  add constraint feedback_field_answers_session_same_business_fkey
  foreign key (session_id, business_id)
  references public.feedback_sessions (id, business_id)
  on delete cascade;

alter table public.feedback_field_answers
  add constraint feedback_field_answers_field_same_business_fkey
  foreign key (field_id, business_id)
  references public.feedback_fields (id, business_id)
  on delete set null (field_id);

create index feedback_field_answers_business_idx
  on public.feedback_field_answers (business_id);

-- ---------------------------------------------------------------------------
-- RLS: owners manage fields; answers are owner-read, written by service role
-- ---------------------------------------------------------------------------

alter table public.feedback_fields enable row level security;
alter table public.feedback_field_answers enable row level security;

create policy feedback_fields_select_own
  on public.feedback_fields for select to authenticated
  using (public.is_business_owner(business_id));

create policy feedback_fields_insert_own
  on public.feedback_fields for insert to authenticated
  with check (public.is_business_owner(business_id));

create policy feedback_fields_update_own
  on public.feedback_fields for update to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy feedback_fields_delete_own
  on public.feedback_fields for delete to authenticated
  using (public.is_business_owner(business_id));

create policy feedback_field_answers_select_own
  on public.feedback_field_answers for select to authenticated
  using (public.is_business_owner(business_id));

grant select, insert, update, delete on public.feedback_fields to authenticated;
grant select on public.feedback_field_answers to authenticated;

-- ---------------------------------------------------------------------------
-- Defaults: one optional long field for new and existing businesses
-- ---------------------------------------------------------------------------

create or replace function public.seed_default_rating_attributes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.rating_attributes (business_id, label, display_order)
  values
    (new.id, 'Overall experience', 1),
    (new.id, 'Quality', 2),
    (new.id, 'Service', 3),
    (new.id, 'Value', 4),
    (new.id, 'Atmosphere', 5);

  insert into public.feedback_fields
    (business_id, label, input_type, is_required, display_order)
  values
    (new.id, 'Anything else you''d like to add?', 'long', false, 1);

  return new;
end;
$$;

insert into public.feedback_fields
  (business_id, label, input_type, is_required, display_order)
select b.id, 'Anything else you''d like to add?', 'long', false, 1
from public.businesses b
where not exists (
  select 1 from public.feedback_fields f where f.business_id = b.id
);

-- Phase 2 product schema + RLS
-- Tenant key: business_id + owner_id (no orgs table)

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.feedback_session_status as enum (
  'started',
  'completed',
  'drafted',
  'abandoned',
  'expired'
);

create type public.analytics_event_type as enum (
  'qr_scan',
  'session_started',
  'feedback_completed',
  'draft_generated',
  'draft_copied',
  'google_continue_clicked'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  slug text unique check (slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  category text check (category is null or char_length(category) between 1 and 80),
  description text check (description is null or char_length(description) <= 2000),
  google_review_url text not null,
  plan text not null default 'free',
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_google_review_url_https
    check (google_review_url ~* '^https://')
);

create table public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  public_token text not null unique check (char_length(public_token) >= 32),
  label text check (label is null or char_length(label) <= 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint qr_codes_revoked_inactive
    check (revoked_at is null or is_active = false)
);

create table public.rating_attributes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, label)
);

create table public.feedback_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  qr_code_id uuid not null references public.qr_codes (id),
  status public.feedback_session_status not null default 'started',
  comment text check (comment is null or char_length(comment) <= 2000),
  client_meta jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.feedback_ratings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  attribute_id uuid not null,
  business_id uuid not null,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  unique (session_id, attribute_id)
);

create table public.review_drafts (
  id uuid primary key default gen_random_uuid(),
  feedback_session_id uuid not null references public.feedback_sessions (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  draft_text text not null check (char_length(draft_text) between 1 and 4000),
  model text not null,
  prompt_version text not null,
  usage jsonb not null default '{}'::jsonb,
  validation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  qr_code_id uuid references public.qr_codes (id),
  feedback_session_id uuid references public.feedback_sessions (id),
  event_type public.analytics_event_type not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Composite uniqueness for cross-table same-business FKs
create unique index businesses_id_business_uidx on public.businesses (id);
create unique index qr_codes_id_business_uidx on public.qr_codes (id, business_id);
create unique index rating_attributes_id_business_uidx
  on public.rating_attributes (id, business_id);
create unique index feedback_sessions_id_business_uidx
  on public.feedback_sessions (id, business_id);

alter table public.feedback_sessions
  add constraint feedback_sessions_qr_same_business_fkey
  foreign key (qr_code_id, business_id)
  references public.qr_codes (id, business_id);

alter table public.feedback_ratings
  add constraint feedback_ratings_session_same_business_fkey
  foreign key (session_id, business_id)
  references public.feedback_sessions (id, business_id)
  on delete cascade;

alter table public.feedback_ratings
  add constraint feedback_ratings_attribute_same_business_fkey
  foreign key (attribute_id, business_id)
  references public.rating_attributes (id, business_id);

alter table public.review_drafts
  add constraint review_drafts_session_same_business_fkey
  foreign key (feedback_session_id, business_id)
  references public.feedback_sessions (id, business_id)
  on delete cascade;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index businesses_owner_id_idx on public.businesses (owner_id);
create index qr_codes_business_active_idx
  on public.qr_codes (business_id)
  where is_active;
create index rating_attributes_business_order_idx
  on public.rating_attributes (business_id, display_order);
create index feedback_sessions_business_created_idx
  on public.feedback_sessions (business_id, created_at desc);
create index feedback_ratings_business_idx on public.feedback_ratings (business_id);
create index review_drafts_business_created_idx
  on public.review_drafts (business_id, created_at desc);
create index analytics_events_funnel_idx
  on public.analytics_events (business_id, event_type, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed five default rating attributes on business create
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
  return new;
end;
$$;

create trigger businesses_seed_rating_attributes
  after insert on public.businesses
  for each row
  execute function public.seed_default_rating_attributes();

-- ---------------------------------------------------------------------------
-- Ownership helper (security definer to avoid recursive RLS)
-- ---------------------------------------------------------------------------

create or replace function public.is_business_owner(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
      and b.owner_id = auth.uid()
  );
$$;

revoke all on function public.is_business_owner(uuid) from public;
grant execute on function public.is_business_owner(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS — default deny; public writes go through Route Handlers + service role
-- ---------------------------------------------------------------------------

alter table public.businesses enable row level security;
alter table public.qr_codes enable row level security;
alter table public.rating_attributes enable row level security;
alter table public.feedback_sessions enable row level security;
alter table public.feedback_ratings enable row level security;
alter table public.review_drafts enable row level security;
alter table public.analytics_events enable row level security;

-- businesses
create policy businesses_select_own
  on public.businesses for select to authenticated
  using (owner_id = auth.uid());

create policy businesses_insert_own
  on public.businesses for insert to authenticated
  with check (owner_id = auth.uid());

create policy businesses_update_own
  on public.businesses for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy businesses_delete_own
  on public.businesses for delete to authenticated
  using (owner_id = auth.uid());

-- qr_codes (owner via business)
create policy qr_codes_select_own
  on public.qr_codes for select to authenticated
  using (public.is_business_owner(business_id));

create policy qr_codes_insert_own
  on public.qr_codes for insert to authenticated
  with check (public.is_business_owner(business_id));

create policy qr_codes_update_own
  on public.qr_codes for update to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy qr_codes_delete_own
  on public.qr_codes for delete to authenticated
  using (public.is_business_owner(business_id));

-- rating_attributes
create policy rating_attributes_select_own
  on public.rating_attributes for select to authenticated
  using (public.is_business_owner(business_id));

create policy rating_attributes_insert_own
  on public.rating_attributes for insert to authenticated
  with check (public.is_business_owner(business_id));

create policy rating_attributes_update_own
  on public.rating_attributes for update to authenticated
  using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

create policy rating_attributes_delete_own
  on public.rating_attributes for delete to authenticated
  using (public.is_business_owner(business_id));

-- feedback_sessions (owner read; writes via service role)
create policy feedback_sessions_select_own
  on public.feedback_sessions for select to authenticated
  using (public.is_business_owner(business_id));

-- feedback_ratings
create policy feedback_ratings_select_own
  on public.feedback_ratings for select to authenticated
  using (public.is_business_owner(business_id));

-- review_drafts
create policy review_drafts_select_own
  on public.review_drafts for select to authenticated
  using (public.is_business_owner(business_id));

-- analytics_events
create policy analytics_events_select_own
  on public.analytics_events for select to authenticated
  using (public.is_business_owner(business_id));

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.businesses to authenticated;
grant select, insert, update, delete on public.qr_codes to authenticated;
grant select, insert, update, delete on public.rating_attributes to authenticated;
grant select on public.feedback_sessions to authenticated;
grant select on public.feedback_ratings to authenticated;
grant select on public.review_drafts to authenticated;
grant select on public.analytics_events to authenticated;

-- service_role bypasses RLS by default in Supabase; no anon table grants

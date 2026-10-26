-- Owner account details. One row per auth user. Not a tenant table.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 80),
  phone text not null default '' check (char_length(phone) <= 20),
  date_of_birth date,
  avatar_path text check (avatar_path is null or char_length(avatar_path) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy profiles_insert_own
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update_own
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

grant select, insert, update on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data->>'full_name', ''), 80),
    left(coalesce(new.raw_user_meta_data->>'phone', ''), 20)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

insert into public.profiles (id, full_name, phone)
select
  id,
  left(coalesce(raw_user_meta_data->>'full_name', ''), 80),
  left(coalesce(raw_user_meta_data->>'phone', ''), 20)
from auth.users
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy avatars_public_read
  on storage.objects for select to public
  using (bucket_id = 'avatars');

create policy avatars_insert_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_update_own
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_delete_own
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

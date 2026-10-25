-- Match the hosted project follow-up: fixed search_path, and no anon execute
-- on security definer helpers. Authenticated still needs execute so RLS
-- policies and the rating-attribute seed trigger can run.

alter function public.set_updated_at() set search_path = public;

revoke all on function public.seed_default_rating_attributes() from public, anon;
revoke all on function public.is_business_owner(uuid) from public, anon;

grant execute on function public.is_business_owner(uuid) to authenticated;
grant execute on function public.seed_default_rating_attributes() to authenticated;

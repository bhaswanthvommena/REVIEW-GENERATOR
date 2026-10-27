-- Enforce the Google review URL host/path allowlist in the database too, so
-- owners cannot bypass the app by writing to PostgREST directly.
-- NOT VALID: applies to new/changed rows without failing on legacy data.
alter table public.businesses
  add constraint businesses_google_review_url_allowlist
  check (
    google_review_url ~* '^https://(g\.page/|maps\.app\.goo\.gl/|goo\.gl/maps|(www\.)?google\.com/(maps|local)|(www\.)?maps\.google\.com/|search\.google\.com/local)'
    and google_review_url !~ '^https://[^/]*@'
  ) not valid;

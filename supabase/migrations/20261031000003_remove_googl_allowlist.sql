-- Update the Google review URL allowlist constraint to remove deprecated goo.gl shortener links.
alter table public.businesses
  drop constraint if exists businesses_google_review_url_allowlist;

alter table public.businesses
  add constraint businesses_google_review_url_allowlist
  check (
    google_review_url ~* '^https://(g\.page/|maps\.app\.goo\.gl/|(www\.)?google\.com/(maps|local)|(www\.)?maps\.google\.com/|search\.google\.com/local)'
    and google_review_url !~ '^https://[^/]*@'
  ) not valid;

-- Add index on created_at for analytics_events to optimize range queries
-- and future retention purges (e.g. archiving/deleting rows older than 90 days).
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx
  ON public.analytics_events (created_at DESC);

COMMENT ON TABLE public.analytics_events IS
  'Retention policy: retain 90 days of high-granularity events in active storage.';

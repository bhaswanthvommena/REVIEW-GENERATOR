import * as Sentry from "@sentry/nextjs";

// Browser DSN is public by design (ingest-only). Prefer NEXT_PUBLIC_SENTRY_DSN.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
    enabled: true,
  });
}

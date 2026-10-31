# Production readiness checklist (MVP §15)

Use this before promoting a staging build to production. Check items only after evidence exists.

## Product / policy

- [ ] Owner can sign up/in, create a business, paste an allowlisted Google review URL, download QR.
- [ ] Customer can open `/r/:token` → rate attributes → fill owner-defined fields (required ones block drafting only, never Continue to Google) → Gemini draft (`review-draft/v2`) → copy → Continue to Google.
- [ ] Continue to Google is **never** gated by ratings or draft quality.
- [ ] No Google Business Profile OAuth/credentials; no auto-post; analytics track click-throughs only.
- [ ] No OpenAI / `OPENAI_*` env; Gemini key is server-only (`GEMINI_API_KEY`).
- [ ] Stripe checkout **not** integrated (billing stub + nullable columns only).
- [x] Multi-business switcher supported with persistent active business cookie across dashboard.

## Security / data

- [ ] Supabase RLS enabled on all app tables; owner isolation spot-checked.
- [ ] Public writes go through Route Handlers + service role after QR token validation.
- [x] Upstash rate limits configured in production (fail-closed) for public endpoints + draft generation. Free Redis database `ventry` (`us-east-1`); `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` set on Vercel for production, preview, and development.
  - Public endpoints throttled: `scan`, `sessions`, `feedback`, `events` (sliding window, per-IP + per-QR-token-hash).
  - Draft generation throttled: 10/10 min per IP, 30/1 h per QR token hash, 200/1 h per business.
- [x] Secrets only in host env (Vercel/Supabase); none committed.
- [x] Security headers / CSP present (see `next.config.ts`), including `Strict-Transport-Security` (HSTS).
- [x] Errors shown to users are generic ("Something went wrong, please try again."); real errors appear only in server logs.
- [x] `save_business_setup` migration applied; saving the setup page updates profile, fields, and questions in one request.
- [ ] `draft_timing` log lines checked on a real draft (retries should be 0 most of the time).
- [ ] Auth redirect URLs set for local, preview, and production.
- [x] `/auth/callback` sanitizes `next` to prevent open redirects; `/auth/signout` validates Origin to prevent CSRF.
- [x] Google review URL allowlist is enforced in-app and backed by a Supabase DB constraint on `businesses.google_review_url` (deprecated `goo.gl` removed).
- [x] Billing plan and stripe customer columns protected at DB level against unauthorized updates (`guard_billing_columns`).
- [x] QR token entropy enforced by DB constraint; atomic 2-draft cap enforced with row locks (`insert_review_draft_capped`).
- [x] Request payload limits (64KB) and JSON content-type validation enforced on all public `/api/v1/r/[token]/*` routes.

## Observability / legal

- [ ] `SENTRY_DSN` (and `NEXT_PUBLIC_SENTRY_DSN` for browser) set in production; test error appears in Sentry.
- [ ] `/privacy` and `/terms` stubs reviewed or replaced by counsel before public launch.
- [ ] Backup / PITR plan noted for Supabase when leaving free tier.
- [x] `/api/v1/health` deep health checks implemented (Gemini API key, Supabase DB reachability, Upstash).
- [x] Index on `analytics_events(created_at DESC)` created for 90-day retention cleanup.

## Quality gates

- [x] `npm run smoke` green locally (lint, typecheck, 24 test files / 101 unit tests, production build).
- [ ] CI green on the release branch / `main`.
- [ ] Staging smoke walkthrough accepted by product owner (see `docs/smoke.md`).

## Ops notes

- Staging DB strategy (locked for MVP): one shared Supabase staging project for previews.
- Branch merge strategy: stack `feat/phase-1` … `feat/phase-6` into `main` via PR(s), or open one PR from `feat/production-hardening` after pushing intermediate branches.

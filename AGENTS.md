<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Review Generator — Agent Guide

Modular monolith: Next.js App Router + Supabase + Gemini API + Upstash + Sentry (Vercel).

## Product constraints (locked)

- **No review gating.** Never hide or disable “Continue to Google” based on star rating or draft quality. Track `google_continue_clicked` / `draft_copied` only — never claim a review was published.
- **No Google OAuth / Business Profile API credentials** in MVP. Owners paste an official Google review URL.
- **No auto-post to Google.** Customers copy drafts and post themselves; we track click-throughs only.
- **No Stripe in MVP.** Billing module is a stub + nullable schema seams only.
- **AI provider = Gemini API** (`GEMINI_API_KEY` / `GEMINI_MODEL`). Do **not** introduce OpenAI SDKs or `OPENAI_*` env vars. Calls are **server-only** (`src/lib/gemini/`, `src/modules/ai`).
- **Multi-attribute ratings (1–5) + owner-defined text fields** (`fields` module; each can be required or optional); ratings and field answers never gate Google.
- Customers are anonymous QR token-holders; only business owners have accounts.
- **No `orgs` table** in MVP; tenant = `business_id` + `owner_id`.

## Architecture map

```
src/app/          App Router pages + /api/v1 route handlers (+ /privacy, /terms)
src/modules/      auth | businesses | attributes | fields | qr | feedback | ai | analytics | google-link | billing
src/lib/          supabase | gemini | rate-limit | env | api
prompts/          review-draft/v1.md (retired), v2.md (current)
supabase/         migrations + config
evals/            dataset.jsonl + graders
docs/             smoke.md | production-checklist.md
```

## Module rules

- Prefer importing from `src/modules/<name>/index.ts` public APIs.
- Avoid deep cross-module imports of internals.
- Gemini and Supabase **service role** live in server-only modules; never import them into client components.
- Sentry initializes only when DSN env vars are set (no secrets in git).

## Security non-negotiables

1. `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, Upstash tokens — **server env only**. Never `NEXT_PUBLIC_*` for those secrets. Sentry DSN may use `NEXT_PUBLIC_SENTRY_DSN` (ingest-oriented) but still do not commit real values.
2. Treat `qr_codes.public_token` like a password (HTTPS, no full-token logging).
3. Zod-validate every API boundary; strip control chars from free-text comments.
4. Treat customer notes as untrusted for prompt injection; system prompt + structured outputs.
5. Google review URLs: `https` only + host allowlist (`modules/google-link`).
6. Rate-limit draft generation (Upstash) in production.
7. No secrets in git; `.env.example` is the contract.
8. RLS on every public table; anonymous writes only via Route Handlers + service role after token checks.
9. Security headers / CSP configured in `next.config.ts`.
10. Never show internal errors. `apiError` masks every 5xx as "Something went wrong, please try again." and logs the real one; use `internalError(error)` in catch-alls. Clients show messages only from `UserFacingError` (`src/lib/api/client.ts`); error boundaries (`error.tsx`, `global-error.tsx`) are generic.

## Business setup save

- The owner edits profile, customer fields and rating questions in one view/edit form (`business/[id]/business-setup.tsx`) and saves with a single `PUT /api/v1/businesses/[id]/setup`.
- The write runs in Postgres function `save_business_setup` (security invoker, RLS applies): atomic, order from array position, removed items soft-deleted.
- Name, category and location are required; there is no slug field.

## Local / tests / migrations / prod ops

```bash
cp .env.example .env.local
npm install
npm run db:start && npm run db:reset   # Docker Desktop required
npm run dev
npm run smoke                          # lint + typecheck + test + build
```

- Migrations: `supabase/migrations/` only.
- Manual smoke: `docs/smoke.md`.
- Production DoD: `docs/production-checklist.md`.
- Staging DB: one shared Supabase staging project for Vercel previews (MVP assumption).
- Push branches from an authenticated terminal if cloud-agent pushes hang on Windows credentials.

## Prompt versioning

- Templates under `prompts/review-draft/vN.md`.
- Persist `prompt_version` + `model` (+ usage) on each `review_drafts` row.

## Do not

- Gate Google CTA on ratings or sentiment.
- Store Google OAuth tokens or scrape unofficial write-review URL patterns as the primary flow.
- Call Gemini from the browser or expose the API key.
- Add OpenAI / `OPENAI_*` configuration.
- Commit `.env.local` or real secrets.
- Skip RLS when adding tables.
- Integrate Stripe checkout in MVP.
- Commit as Cursor/agent identity — use the machine git `user.name` / `user.email` only.

## PR expectations

- CI green: lint, `tsc --noEmit`, Vitest, build (`npm run smoke` locally).
- Security-sensitive changes (authz, tokens, Gemini, RLS, headers) called out in the PR description.
- Update `docs/production-checklist.md` when DoD evidence changes.

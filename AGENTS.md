<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Review Generator — Agent Guide

Modular monolith: Next.js App Router + Supabase + Gemini API + Upstash + Sentry (Vercel).

## Product constraints (locked)

- **No review gating.** Never hide or disable “Continue to Google” based on star rating or draft quality.
- **No Google OAuth / Business Profile API credentials** in MVP. Owners paste an official Google review URL.
- **No auto-post to Google.** Customers copy drafts and post themselves; we track click-throughs only.
- **No Stripe in MVP.** Billing module is a stub + nullable schema seams only.
- **AI provider = Gemini API** (`GEMINI_API_KEY` / `GEMINI_MODEL`). Do **not** introduce OpenAI SDKs or `OPENAI_*` env vars.
- **Multi-attribute ratings (1–5) + optional comment** are the feedback shape (schema arrives in Phase 2); ratings never gate Google.
- Customers are anonymous token-holders; only business owners have accounts.

## Architecture map

```
src/app/          App Router pages + /api/v1 route handlers
src/modules/      Domain modules (auth, businesses, tokens, feedback, ai, …)
src/lib/          Shared infra (supabase, gemini, rate-limit, env, validation)
src/components/   Shared UI
prompts/          Versioned AI prompt templates
supabase/         Migrations + config (Phase 2+)
evals/            AI draft eval fixtures (Phase 4+)
```

## Module rules

- Prefer importing from `src/modules/<name>/index.ts` public APIs.
- Avoid deep cross-module imports of internals.
- Gemini and Supabase **service role** live in server-only modules (`src/lib/*`); never import them into client components.

## Security non-negotiables

1. `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, Upstash tokens, Sentry DSN — **server env only**. Never `NEXT_PUBLIC_*` for secrets.
2. Treat `review_tokens.token` like a password (HTTPS, no full-token logging).
3. Zod-validate every API boundary; strip control chars from free-text notes.
4. Treat customer notes as untrusted for prompt injection; system prompt + structured outputs.
5. Google review URLs: `https` only + host allowlist (see `modules/google-link` when added).
6. Rate-limit public draft/feedback/analytics endpoints (Upstash).
7. No secrets in git; use `.env.example` as the contract.

## Local / tests / migrations

```bash
cp .env.example .env.local   # fill values as services are provisioned
npm install
npm run dev                  # http://localhost:3000
npm run typecheck
npm run test                 # Vitest
npm run build
npm run test:e2e             # Playwright (when specs exist)
```

Supabase CLI migrations land in Phase 2 (`supabase/migrations/`). Do not invent ad-hoc SQL outside migrations.

## Prompt versioning

- Templates under `prompts/review-draft/vN.md`.
- Persist `prompt_version` + `model` on each draft row when AI lands (Phase 4).

## Do not

- Gate Google CTA on ratings or sentiment.
- Store Google OAuth tokens or scrape unofficial write-review URL patterns as primary flow.
- Call Gemini from the browser or expose the API key.
- Add OpenAI / `OPENAI_*` configuration.
- Commit `.env.local` or real secrets.
- Skip RLS when adding tables (Phase 2+).
- Integrate Stripe checkout in MVP.

## PR expectations

- CI green: lint, `tsc --noEmit`, Vitest, build.
- New behavior covered by unit/integration tests where practical; e2e for critical paths once present.
- Security-sensitive changes (authz, tokens, Gemini, RLS) called out in the PR description.

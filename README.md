# Ventry

AI-assisted review drafts for local businesses: print/share a QR → customer rates attributes + optional comment → Gemini drafts a review → customer copies and continues to the business’s Google review link.

**No review gating. No auto-post to Google. Gemini API only (not OpenAI). No Stripe checkout in MVP.**

## Stack (MVP)

- Next.js App Router (TypeScript strict) + Tailwind
- Supabase (Postgres, Auth, RLS)
- Gemini API (server-only)
- Upstash Redis (draft rate limits)
- Sentry (env-gated) + Vercel

## Local setup

### Requirements

- Node.js **22+** (CI uses Node 22; local Node 24 is fine)
- npm 10+
- [Docker Desktop](https://docs.docker.com/get-docker/) running for local Supabase
- Supabase CLI via `npx supabase`

### Steps

1. Clone and install:

   ```bash
   npm install
   cp .env.example .env.local
   ```

2. Start Postgres/Auth locally and apply migrations:

   ```bash
   npm run db:start
   npm run db:reset
   ```

   Copy URL, anon key, and service role key from the CLI output into `.env.local`.

3. Fill remaining env (see `.env.example`):

   | Variable | Notes |
   |----------|--------|
   | `NEXT_PUBLIC_APP_URL` | e.g. `http://localhost:3000` |
   | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server only |
   | `GEMINI_API_KEY` / `GEMINI_MODEL` | Google Gemini — **not** OpenAI |
   | `UPSTASH_REDIS_REST_*` | Optional locally; required in prod for draft limits |
   | `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Optional locally; set in prod |

4. Enable Supabase **Email** auth (magic link + password). Redirect: `http://localhost:3000/auth/callback`.

5. Run:

   ```bash
   npm run dev
   ```

### End-to-end product path

1. Owner sign-in → create business (allowlisted Google review URL) → attributes → **QR** → create/download.
2. Open `/r/:token` → rate 1–5 (none preselected) → optional comment → generate/edit/copy draft → **Continue to Google** (always available; never gated by stars).
3. Owner **Analytics** funnel (scans → sessions → feedback → drafts → copies → Google clicks).
4. Legal stubs: [`/privacy`](/privacy), [`/terms`](/terms).

### Quality / smoke

```bash
npm run smoke          # lint + typecheck + vitest + build
npm run test:e2e       # Playwright home smoke (no DB)
```

Manual staging steps: [`docs/smoke.md`](./docs/smoke.md).  
Production DoD checklist: [`docs/production-checklist.md`](./docs/production-checklist.md).

### Cloud Supabase / deploy

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

Deploy on Vercel; set the same env vars for Preview + Production. Point Supabase Auth redirects at preview/prod URLs. One shared staging Supabase project is the MVP assumption for previews.

### Git / branch push notes

Phase work may live on stacked branches (`feat/phase-1-bootstrap` … `feat/phase-6-prod-hardening`). If `git push` fails non-interactively (Windows credential manager), push from an authenticated terminal:

```bash
git push -u origin feat/phase-6-prod-hardening
```

Prefer opening a PR from the latest phase branch (or merge the stack into `main` sequentially) so CI runs on GitHub.

### Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` / `build` / `start` | App |
| `npm run lint` / `typecheck` / `test` | Quality |
| `npm run smoke` | Full local CI-equivalent gate |
| `npm run test:e2e` | Playwright |
| `npm run db:start` / `db:reset` / `db:stop` | Local Supabase |

## Agents

Conventions and locks: [`AGENTS.md`](./AGENTS.md).

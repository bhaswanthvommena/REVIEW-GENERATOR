# Review Generator

AI-assisted review drafts for local businesses: print/share a QR → customer leaves feedback → Gemini drafts a review → customer copies and continues to the business’s Google review link.

**No review gating. No auto-post to Google. Gemini API only (not OpenAI).**

## Stack (MVP)

- Next.js App Router (TypeScript strict) + Tailwind
- Supabase (Postgres, Auth, RLS) — wired in Phase 2+
- Gemini API (server-only)
- Upstash Redis (rate limits)
- Sentry + Vercel

## Local setup

### Requirements

- Node.js **22+** (CI uses Node 22; local Node 24 is fine)
- npm 10+

### Steps

1. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

2. Copy env template and fill values as you provision services:

   ```bash
   cp .env.example .env.local
   ```

   Required keys (see `.env.example`):

   | Variable | Notes |
   |----------|--------|
   | `NEXT_PUBLIC_APP_URL` | e.g. `http://localhost:3000` |
   | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server only |
   | `GEMINI_API_KEY` / `GEMINI_MODEL` | Google Gemini API — **not** OpenAI |
   | `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limits |
   | `SENTRY_DSN` | Optional in early local work |

3. Run the app:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit/smoke |
| `npm run test:e2e` | Playwright (specs land in later phases) |

Phase 1 is a bootstrap shell: empty app + tooling. Auth, Supabase migrations, QR, and AI arrive in later phases — see project `docs/mvp-implementation-plan.md` / `AGENTS.md`.

## Agents

Cursor/agent conventions and product locks live in [`AGENTS.md`](./AGENTS.md).

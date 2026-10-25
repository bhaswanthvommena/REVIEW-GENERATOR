# Review Generator

AI-assisted review drafts for local businesses: print/share a QR → customer rates attributes + optional comment → Gemini drafts a review → customer copies and continues to the business’s Google review link.

**No review gating. No auto-post to Google. Gemini API only (not OpenAI).**

## Stack (MVP)

- Next.js App Router (TypeScript strict) + Tailwind
- Supabase (Postgres, Auth, RLS)
- Gemini API (server-only; Phase 4)
- Upstash Redis (rate limits; Phase 4)
- Sentry + Vercel

## Local setup

### Requirements

- Node.js **22+** (CI uses Node 22; local Node 24 is fine)
- npm 10+
- [Docker](https://docs.docker.com/get-docker/) for local Supabase (`supabase start`)
- Supabase CLI via `npx supabase` (no global install required)

### Steps

1. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

2. Copy env template:

   ```bash
   cp .env.example .env.local
   ```

3. Start local Supabase and apply migrations:

   ```bash
   npm run db:start
   npm run db:reset
   ```

   `db:reset` applies `supabase/migrations/*` and `supabase/seed.sql`.

   Copy the local API URL, anon key, and service role key from the `supabase start` output into `.env.local`:

   | Variable | Notes |
   |----------|--------|
   | `NEXT_PUBLIC_APP_URL` | e.g. `http://localhost:3000` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Local or cloud project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server only |
   | `GEMINI_API_KEY` / `GEMINI_MODEL` | Google Gemini — **not** OpenAI (server-only drafts) |
   | `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Draft rate limits (optional locally; skipped if unset) |
   | `SENTRY_DSN` | Optional early |

   In the Supabase dashboard (or local Studio), enable **Email** auth with magic link and password. Add redirect URL `http://localhost:3000/auth/callback`.

4. Run the app:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) → **Owner sign in** → create a business (Google review URL allowlisted) → manage rating attributes → **QR** page.

### Try the QR → feedback flow (Phase 3)

1. With Supabase running and migrations applied (`npm run db:reset`), sign in as an owner.
2. Create a business with an allowlisted Google review URL.
3. Open **Dashboard → QR** → **Create QR** → download PNG/SVG or **Open** the public URL.
4. On `/r/:token` (mobile-friendly): rate every attribute 1–5 (none preselected), optional comment, submit.
5. Inactive/revoked QR codes show a friendly unavailable state (`410`).
6. After submit, tap **Generate draft** (Gemini). Edit or regenerate. **Continue to Google** remains available — never hidden based on star values.

Unit tests cover tokens, QR render, feedback validation, draft graders, and mocked Gemini without Docker/live API keys. Live DB integration is skipped when Docker/Supabase is unavailable.

### Cloud Supabase (alternative)

Link a project and push migrations:

```bash
npx supabase link --project-ref <ref>
npx supabase db push
```

### Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest |
| `npm run test:e2e` | Playwright (later phases) |
| `npm run db:start` | Local Supabase |
| `npm run db:stop` | Stop local Supabase |
| `npm run db:reset` | Reset DB + apply migrations |

Phase 4 covers Gemini structured drafts (`prompts/review-draft/v1.md`), Upstash draft rate limits, and eval fixtures — see `AGENTS.md`.

## Agents

Cursor/agent conventions and product locks live in [`AGENTS.md`](./AGENTS.md).

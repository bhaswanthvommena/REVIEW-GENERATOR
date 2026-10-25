# Smoke steps

## Automated (no Docker / no live keys required)

```bash
npm run smoke
```

Runs lint → typecheck → vitest → production build with placeholder env.

Optional home e2e (no Supabase):

```bash
npx playwright install chromium
npm run test:e2e
```

## Manual staging / local (requires Docker + keys)

1. Start Docker Desktop, then:

   ```bash
   npm run db:start
   npm run db:reset
   ```

2. Copy Supabase URL/anon/service_role into `.env.local` plus:

   - `GEMINI_API_KEY` / `GEMINI_MODEL`
   - Optional Upstash + Sentry DSNs
   - `NEXT_PUBLIC_APP_URL=http://localhost:3000`

3. Enable Supabase Email auth; redirect `http://localhost:3000/auth/callback`.

4. `npm run dev` and walk:

   - Owner login → create business (Google URL) → attributes → create QR → download PNG
   - Open `/r/:token` → rate → draft → copy → Continue to Google
   - Confirm Analytics funnel increments
   - Deactivate QR → public link shows unavailable
   - Open `/privacy` and `/terms`

5. Staging: repeat against Vercel preview + staging Supabase; confirm Sentry receives a test error if DSN set.

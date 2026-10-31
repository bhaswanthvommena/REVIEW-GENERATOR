import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";
import {
  requireSupabasePublicEnv,
  requireSupabaseServiceEnv,
} from "@/lib/env";

export async function createClient() {
  // Opt in to dynamic request-time rendering so Supabase auth timestamp checks
  // (Date.now()) do not trigger Next.js prerendering warnings.
  try {
    await connection();
  } catch {
    // Outside a Next.js request scope (e.g. tests or build analysis), connection() may throw; ignore.
  }

  const cookieStore = await cookies();
  const { url, anonKey } = requireSupabasePublicEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — the proxy refreshes sessions.
        }
      },
    },
  });
}

/** Service-role client for privileged server paths. Never import from client. */
export function createServiceClient() {
  const { url, serviceRoleKey } = requireSupabaseServiceEnv();
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  requireSupabasePublicEnv,
  requireSupabaseServiceEnv,
} from "@/lib/env";

export async function createClient() {
  // Suspend prerender before reading env. A missing public key must not fail
  // `next build`; the session cookie is only available on a real request.
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
          // Called from a Server Component — middleware will refresh sessions.
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

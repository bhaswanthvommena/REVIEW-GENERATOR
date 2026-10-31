import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthUser = {
  id: string;
  email: string | undefined;
};

export async function getSessionUser(
  supabase: SupabaseClient,
): Promise<AuthUser | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

export async function requireUser(
  supabase: SupabaseClient,
): Promise<AuthUser> {
  const user = await getSessionUser(supabase);
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

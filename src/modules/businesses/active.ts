import type { SupabaseClient } from "@supabase/supabase-js";
import { listBusinessesForOwner } from "./service";
import type { Business } from "./types";

/**
 * Resolve the currently selected business for an owner given an optional cookie-stored ID.
 * Validates ownership and falls back to the first business if unselected or not found.
 */
export async function getActiveBusinessForOwner(
  supabase: SupabaseClient,
  ownerId: string,
  cookieBusinessId?: string | null,
): Promise<{
  active: Business | null;
  businesses: Business[];
}> {
  const businesses = await listBusinessesForOwner(supabase, ownerId);
  if (businesses.length === 0) {
    return { active: null, businesses: [] };
  }

  const match = cookieBusinessId
    ? businesses.find((b) => b.id === cookieBusinessId)
    : undefined;
  const active = match ?? businesses[0] ?? null;

  return { active, businesses };
}

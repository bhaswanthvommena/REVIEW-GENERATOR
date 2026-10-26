import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BusinessCreateInput,
  BusinessSetupInput,
  BusinessUpdateInput,
} from "./schemas";
import type { Business } from "./types";

export async function listBusinessesForOwner(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<Business[]> {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as Business[];
}

export async function getBusinessForOwner(
  supabase: SupabaseClient,
  businessId: string,
  ownerId: string,
): Promise<Business | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return (data as Business | null) ?? null;
}

export async function createBusiness(
  supabase: SupabaseClient,
  ownerId: string,
  input: BusinessCreateInput,
): Promise<Business> {
  const { data, error } = await supabase
    .from("businesses")
    .insert({
      owner_id: ownerId,
      name: input.name,

      category: input.category,
      location: input.location,
      description: input.description ?? null,
      google_review_url: input.googleReviewUrl,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as Business;
}

export async function updateBusiness(
  supabase: SupabaseClient,
  businessId: string,
  ownerId: string,
  input: BusinessUpdateInput,
): Promise<Business> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;

  if (input.category !== undefined) patch.category = input.category;
  if (input.location !== undefined) patch.location = input.location;
  if (input.description !== undefined) patch.description = input.description;
  if (input.googleReviewUrl !== undefined) {
    patch.google_review_url = input.googleReviewUrl;
  }

  const { data, error } = await supabase
    .from("businesses")
    .update(patch)
    .eq("id", businessId)
    .eq("owner_id", ownerId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as Business;
}

/** The setup was changed elsewhere, or two names collide. */
export class SetupConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SetupConflictError";
  }
}

/** Save profile, customer fields and rating questions in one transaction. */
export async function saveBusinessSetup(
  supabase: SupabaseClient,
  businessId: string,
  input: BusinessSetupInput,
): Promise<void> {
  const { error } = await supabase.rpc("save_business_setup", {
    p_business_id: businessId,
    p_payload: {
      name: input.name,
      category: input.category,
      location: input.location,
      description: input.description ?? "",
      google_review_url: input.googleReviewUrl,
      fields: input.fields.map((item) => ({
        id: item.id,
        label: item.label,
        is_required: item.isRequired,
        is_active: item.isActive,
      })),
      attributes: input.attributes.map((item) => ({
        id: item.id,
        label: item.label,
        is_active: item.isActive,
      })),
    },
  });

  if (!error) return;
  if (error.code === "23505") {
    throw new SetupConflictError("Two items share the same name.");
  }
  if (error.message.includes("stale")) {
    throw new SetupConflictError(
      "This page is out of date. Reload it and try again.",
    );
  }
  throw new Error(error.message);
}

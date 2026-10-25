import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusinessCreateInput, BusinessUpdateInput } from "./schemas";
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
      slug: input.slug ?? null,
      category: input.category ?? null,
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
  if (input.slug !== undefined) patch.slug = input.slug;
  if (input.category !== undefined) patch.category = input.category;
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

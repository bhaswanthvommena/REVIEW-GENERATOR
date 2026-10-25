import type { SupabaseClient } from "@supabase/supabase-js";
import type { AttributeCreateInput, AttributeUpdateInput } from "./schemas";
import type { RatingAttribute } from "./types";

export async function listAttributesForBusiness(
  supabase: SupabaseClient,
  businessId: string,
): Promise<RatingAttribute[]> {
  const { data, error } = await supabase
    .from("rating_attributes")
    .select("*")
    .eq("business_id", businessId)
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as RatingAttribute[];
}

export async function createAttribute(
  supabase: SupabaseClient,
  businessId: string,
  input: AttributeCreateInput,
): Promise<RatingAttribute> {
  const { data, error } = await supabase
    .from("rating_attributes")
    .insert({
      business_id: businessId,
      label: input.label,
      display_order: input.displayOrder ?? 0,
      is_active: input.isActive ?? true,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as RatingAttribute;
}

export async function updateAttribute(
  supabase: SupabaseClient,
  attributeId: string,
  businessId: string,
  input: AttributeUpdateInput,
): Promise<RatingAttribute> {
  const patch: Record<string, unknown> = {};
  if (input.label !== undefined) patch.label = input.label;
  if (input.displayOrder !== undefined) patch.display_order = input.displayOrder;
  if (input.isActive !== undefined) patch.is_active = input.isActive;

  const { data, error } = await supabase
    .from("rating_attributes")
    .update(patch)
    .eq("id", attributeId)
    .eq("business_id", businessId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as RatingAttribute;
}

export async function deleteAttribute(
  supabase: SupabaseClient,
  attributeId: string,
  businessId: string,
): Promise<void> {
  const { error } = await supabase
    .from("rating_attributes")
    .delete()
    .eq("id", attributeId)
    .eq("business_id", businessId);

  if (error) {
    throw new Error(error.message);
  }
}

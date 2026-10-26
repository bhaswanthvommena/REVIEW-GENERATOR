import type { SupabaseClient } from "@supabase/supabase-js";
import type { FieldCreateInput, FieldUpdateInput } from "./schemas";
import type { FeedbackField } from "./types";

export class FieldNameTakenError extends Error {
  constructor() {
    super("A field with that name already exists.");
    this.name = "FieldNameTakenError";
  }
}

export class FieldNotFoundError extends Error {
  constructor() {
    super("Field not found.");
    this.name = "FieldNotFoundError";
  }
}

function toServiceError(error: { message: string; code?: string }): Error {
  // 23505 = unique_violation on (business_id, label) for live fields.
  if (error.code === "23505") {
    return new FieldNameTakenError();
  }
  return new Error(error.message);
}

export async function listFieldsForBusiness(
  supabase: SupabaseClient,
  businessId: string,
): Promise<FeedbackField[]> {
  const { data, error } = await supabase
    .from("feedback_fields")
    .select("*")
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as FeedbackField[];
}

async function nextDisplayOrder(
  supabase: SupabaseClient,
  businessId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("feedback_fields")
    .select("display_order")
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return ((data?.display_order as number | undefined) ?? 0) + 1;
}

export async function createField(
  supabase: SupabaseClient,
  businessId: string,
  input: FieldCreateInput,
): Promise<FeedbackField> {
  const displayOrder =
    input.displayOrder ?? (await nextDisplayOrder(supabase, businessId));

  const { data, error } = await supabase
    .from("feedback_fields")
    .insert({
      business_id: businessId,
      label: input.label,
      input_type: input.inputType ?? "short",
      is_required: input.isRequired ?? false,
      is_active: input.isActive ?? true,
      display_order: displayOrder,
    })
    .select("*")
    .single();

  if (error) {
    throw toServiceError(error);
  }
  return data as FeedbackField;
}

export async function updateField(
  supabase: SupabaseClient,
  fieldId: string,
  businessId: string,
  input: FieldUpdateInput,
): Promise<FeedbackField> {
  const patch: Record<string, unknown> = {};
  if (input.label !== undefined) patch.label = input.label;
  if (input.inputType !== undefined) patch.input_type = input.inputType;
  if (input.isRequired !== undefined) patch.is_required = input.isRequired;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  if (input.displayOrder !== undefined) patch.display_order = input.displayOrder;

  const { data, error } = await supabase
    .from("feedback_fields")
    .update(patch)
    .eq("id", fieldId)
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .select("*")
    .maybeSingle();

  if (error) {
    throw toServiceError(error);
  }
  if (!data) {
    throw new FieldNotFoundError();
  }
  return data as FeedbackField;
}

/** Soft delete so earlier answers keep their link and label. */
export async function deleteField(
  supabase: SupabaseClient,
  fieldId: string,
  businessId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("feedback_fields")
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq("id", fieldId)
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new FieldNotFoundError();
  }
}

export type FieldInputType = "short" | "long";

export type FeedbackField = {
  id: string;
  business_id: string;
  label: string;
  input_type: FieldInputType;
  is_required: boolean;
  is_active: boolean;
  display_order: number;
  deleted_at: string | null;
  created_at: string;
};

/** Longest answer a customer can give, by field type. */
export const FIELD_MAX_LENGTH: Record<FieldInputType, number> = {
  short: 200,
  long: 1000,
};

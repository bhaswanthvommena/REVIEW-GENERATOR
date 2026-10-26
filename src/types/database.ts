/**
 * Hand-maintained row shapes mirroring supabase/migrations/20261025120000_init.sql.
 * Replace with generated types (`supabase gen types`) when the project is linked.
 */

export type FeedbackSessionStatus =
  | "started"
  | "completed"
  | "drafted"
  | "abandoned"
  | "expired";

export type AnalyticsEventType =
  | "qr_scan"
  | "session_started"
  | "feedback_completed"
  | "draft_generated"
  | "draft_copied"
  | "google_continue_clicked";

export type BusinessRow = {
  id: string;
  owner_id: string;
  name: string;
  slug: string | null;
  category: string | null;
  description: string | null;
  google_review_url: string;
  plan: string;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type QrCodeRow = {
  id: string;
  business_id: string;
  public_token: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
  revoked_at: string | null;
};

export type RatingAttributeRow = {
  id: string;
  business_id: string;
  label: string;
  display_order: number;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
};

export type FeedbackFieldInputType = "short" | "long";

export type FeedbackFieldRow = {
  id: string;
  business_id: string;
  label: string;
  input_type: FeedbackFieldInputType;
  is_required: boolean;
  is_active: boolean;
  display_order: number;
  deleted_at: string | null;
  created_at: string;
};

export type FeedbackFieldAnswerRow = {
  id: string;
  session_id: string;
  field_id: string | null;
  business_id: string;
  label: string;
  value: string;
  created_at: string;
};

export type FeedbackSessionRow = {
  id: string;
  business_id: string;
  qr_code_id: string;
  status: FeedbackSessionStatus;
  comment: string | null;
  client_meta: Record<string, unknown>;
  expires_at: string | null;
  created_at: string;
  completed_at: string | null;
};

export type FeedbackRatingRow = {
  id: string;
  session_id: string;
  attribute_id: string | null;
  business_id: string;
  rating: number;
  created_at: string;
};

export type ReviewDraftRow = {
  id: string;
  feedback_session_id: string;
  business_id: string;
  draft_text: string;
  model: string;
  prompt_version: string;
  usage: Record<string, unknown>;
  validation: Record<string, unknown>;
  created_at: string;
};

export type AnalyticsEventRow = {
  id: number;
  business_id: string;
  qr_code_id: string | null;
  feedback_session_id: string | null;
  event_type: AnalyticsEventType;
  props: Record<string, unknown>;
  created_at: string;
};

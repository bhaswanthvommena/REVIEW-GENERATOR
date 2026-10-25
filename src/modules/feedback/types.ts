import type { FeedbackSessionStatus } from "@/types/database";

export type FeedbackSession = {
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

export const DEFAULT_SESSION_TTL_HOURS = 24;

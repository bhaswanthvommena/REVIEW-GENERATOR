import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalyticsEventType } from "@/types/database";

export async function recordAnalyticsEvent(
  service: SupabaseClient,
  input: {
    businessId: string;
    qrCodeId?: string | null;
    feedbackSessionId?: string | null;
    eventType: AnalyticsEventType;
    props?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await service.from("analytics_events").insert({
    business_id: input.businessId,
    qr_code_id: input.qrCodeId ?? null,
    feedback_session_id: input.feedbackSessionId ?? null,
    event_type: input.eventType,
    props: input.props ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}

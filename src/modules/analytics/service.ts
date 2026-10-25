import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalyticsEventType } from "@/types/database";
import {
  aggregateFunnelCounts,
  resolveAnalyticsDateRange,
  type FunnelSummary,
} from "./funnel";

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

export async function getFunnelSummaryForBusiness(
  supabase: SupabaseClient,
  businessId: string,
  dateInput: { from?: string | null; to?: string | null },
): Promise<FunnelSummary> {
  const range = resolveAnalyticsDateRange(dateInput);

  const { data, error } = await supabase
    .from("analytics_events")
    .select("event_type")
    .eq("business_id", businessId)
    .gte("created_at", range.fromIso)
    .lt("created_at", range.toIsoExclusive);

  if (error) {
    throw new Error(error.message);
  }

  const counts = aggregateFunnelCounts(data ?? []);
  const totalEvents = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return {
    from: range.from,
    to: range.to,
    counts,
    totalEvents,
  };
}

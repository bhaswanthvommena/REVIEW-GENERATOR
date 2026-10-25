import { z } from "zod";

export const PublicAnalyticsEventSchema = z.object({
  eventType: z.enum([
    "qr_scan",
    "session_started",
    "feedback_completed",
    "draft_generated",
    "draft_copied",
    "google_continue_clicked",
  ]),
  feedbackSessionId: z.string().uuid().optional(),
  props: z.record(z.string(), z.unknown()).optional(),
});

export type PublicAnalyticsEventInput = z.infer<
  typeof PublicAnalyticsEventSchema
>;

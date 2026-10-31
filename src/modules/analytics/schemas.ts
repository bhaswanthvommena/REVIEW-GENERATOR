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
  props: z
    .record(z.string().max(40), z.union([z.string().max(80), z.number(), z.boolean(), z.null()]))
    .refine((value) => Object.keys(value).length <= 10, "Too many props")
    .optional(),
});

export type PublicAnalyticsEventInput = z.infer<
  typeof PublicAnalyticsEventSchema
>;

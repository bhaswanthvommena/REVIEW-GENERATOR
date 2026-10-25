import { ZodError } from "zod";
import { apiError, apiOk } from "@/lib/api/errors";
import { createServiceClient } from "@/lib/supabase/server";
import { recordAnalyticsEvent } from "@/modules/analytics";
import {
  completeFeedback,
  FeedbackSubmitSchema,
  SessionExpiredError,
  SessionInvalidError,
} from "@/modules/feedback";
import {
  isValidPublicTokenShape,
  QrInactiveError,
  QrNotFoundError,
  resolveActiveQrByToken,
} from "@/modules/qr";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    if (!isValidPublicTokenShape(token)) {
      return apiError(404, "not_found", "QR code not found");
    }

    const service = createServiceClient();
    const resolved = await resolveActiveQrByToken(service, token);
    const json: unknown = await request.json();
    const input = FeedbackSubmitSchema.parse(json);

    const session = await completeFeedback(service, {
      tokenBusinessId: resolved.businessId,
      tokenQrCodeId: resolved.qrCodeId,
      requiredAttributeIds: resolved.attributes.map((a) => a.id),
      input,
    });

    await recordAnalyticsEvent(service, {
      businessId: resolved.businessId,
      qrCodeId: resolved.qrCodeId,
      feedbackSessionId: session.id,
      eventType: "feedback_completed",
      props: {
        ratingCount: input.ratings.length,
        hasComment: Boolean(input.comment),
      },
    });

    return apiOk({
      sessionId: session.id,
      status: session.status,
      // Draft generation is Phase 4. Google CTA is never gated by stars.
      next: {
        draftAvailable: false,
        googleReviewUrl: resolved.googleReviewUrl,
        googleCtaPolicy: "always_available_no_rating_gate",
      },
    });
  } catch (error) {
    if (error instanceof QrNotFoundError) {
      return apiError(404, "not_found", error.message);
    }
    if (error instanceof QrInactiveError) {
      return apiError(410, "qr_inactive", error.message);
    }
    if (error instanceof SessionExpiredError) {
      return apiError(410, "session_expired", error.message);
    }
    if (error instanceof SessionInvalidError) {
      return apiError(400, "session_invalid", error.message);
    }
    if (error instanceof ZodError) {
      return apiError(400, "validation_error", "Invalid feedback payload", error.issues);
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return apiError(400, "feedback_failed", message);
  }
}

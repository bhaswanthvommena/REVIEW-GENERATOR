import { ZodError } from "zod";
import { parseJsonBody, PayloadTooLargeError, UnsupportedMediaTypeError } from "@/lib/api/body";
import { apiError, apiOk, internalError } from "@/lib/api/errors";
import {
  enforcePublicRateLimit,
  getClientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/server";
import { recordAnalyticsEvent } from "@/modules/analytics";
import {
  completeFeedback,
  FeedbackSubmitSchema,
  FeedbackValidationError,
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

    const rate = await enforcePublicRateLimit({
      scope: "feedback",
      ip: getClientIp(request),
      token,
    });
    if (!rate.success) return rateLimitedResponse(rate);

    const service = createServiceClient();
    const resolved = await resolveActiveQrByToken(service, token);
    const json: unknown = await parseJsonBody(request);
    const input = FeedbackSubmitSchema.parse(json);

    const session = await completeFeedback(service, {
      tokenBusinessId: resolved.businessId,
      tokenQrCodeId: resolved.qrCodeId,
      requiredAttributeIds: resolved.attributes.map((a) => a.id),
      fields: resolved.fields.map((field) => ({
        id: field.id,
        label: field.label,
        isRequired: field.isRequired,
        maxLength: field.maxLength,
      })),
      input,
    });

    await recordAnalyticsEvent(service, {
      businessId: resolved.businessId,
      qrCodeId: resolved.qrCodeId,
      feedbackSessionId: session.id,
      eventType: "feedback_completed",
      props: {
        ratingCount: input.ratings.length,
        answerCount: input.answers.filter((a) => a.value.trim() !== "").length,
      },
    });

    return apiOk({
      sessionId: session.id,
      status: session.status,
      // Draft via POST /drafts. Google CTA is never gated by stars.
      next: {
        draftAvailable: true,
        googleReviewUrl: resolved.googleReviewUrl,
        googleCtaPolicy: "always_available_no_rating_gate",
      },
    });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return apiError(413, "payload_too_large", error.message);
    }
    if (error instanceof UnsupportedMediaTypeError) {
      return apiError(415, "unsupported_media_type", error.message);
    }
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
    if (error instanceof FeedbackValidationError) {
      return apiError(400, "validation_error", error.message);
    }
    if (error instanceof ZodError) {
      return apiError(400, "validation_error", "Invalid feedback payload", error.issues);
    }
    return internalError(error, "feedback_failed");
  }
}

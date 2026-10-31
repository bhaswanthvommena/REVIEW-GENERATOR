import { ZodError } from "zod";
import { parseJsonBody, PayloadTooLargeError, UnsupportedMediaTypeError } from "@/lib/api/body";
import { apiError, apiOk, internalError } from "@/lib/api/errors";
import {
  enforcePublicRateLimit,
  getClientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/server";
import {
  PublicAnalyticsEventSchema,
  recordAnalyticsEvent,
} from "@/modules/analytics";
import {
  isValidPublicTokenShape,
  QrInactiveError,
  QrNotFoundError,
  resolveActiveQrByToken,
} from "@/modules/qr";

type RouteContext = { params: Promise<{ token: string }> };

/** Public analytics for copy / Google continue (token-scoped). */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    if (!isValidPublicTokenShape(token)) {
      return apiError(404, "not_found", "QR code not found");
    }

    const rate = await enforcePublicRateLimit({
      scope: "event",
      ip: getClientIp(request),
      token,
    });
    if (!rate.success) return rateLimitedResponse(rate);

    const json: unknown = await parseJsonBody(request);
    const input = PublicAnalyticsEventSchema.parse(json);

    // Phase 5 public path focuses on copy + Google continue.
    if (
      input.eventType !== "draft_copied" &&
      input.eventType !== "google_continue_clicked"
    ) {
      return apiError(
        400,
        "event_not_allowed",
        "This endpoint accepts draft_copied or google_continue_clicked only",
      );
    }

    const service = createServiceClient();
    const resolved = await resolveActiveQrByToken(service, token);

    if (input.feedbackSessionId) {
      const { data: session } = await service
        .from("feedback_sessions")
        .select("id, business_id, qr_code_id")
        .eq("id", input.feedbackSessionId)
        .maybeSingle();

      if (
        !session ||
        session.business_id !== resolved.businessId ||
        session.qr_code_id !== resolved.qrCodeId
      ) {
        return apiError(400, "session_invalid", "Session does not match this QR.");
      }
    }

    await recordAnalyticsEvent(service, {
      businessId: resolved.businessId,
      qrCodeId: resolved.qrCodeId,
      feedbackSessionId: input.feedbackSessionId ?? null,
      eventType: input.eventType,
      props: input.props ?? {},
    });

    return apiOk({ ok: true }, 201);
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
    if (error instanceof ZodError) {
      return apiError(400, "validation_error", "Invalid event payload", error.issues);
    }
    return internalError(error, "internal_error");
  }
}

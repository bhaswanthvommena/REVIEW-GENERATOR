import { z } from "zod";
import { parseJsonBody, PayloadTooLargeError, UnsupportedMediaTypeError } from "@/lib/api/body";
import { apiError, apiOk, internalError } from "@/lib/api/errors";
import {
  enforcePublicRateLimit,
  getClientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/server";
import { recordAnalyticsEvent } from "@/modules/analytics";
import { createFeedbackSession } from "@/modules/feedback";
import {
  isValidPublicTokenShape,
  QrInactiveError,
  QrNotFoundError,
  resolveActiveQrByToken,
} from "@/modules/qr";

type RouteContext = { params: Promise<{ token: string }> };

const ClientMetaSchema = z
  .record(
    z.string().max(30),
    z.union([z.string().max(100), z.number(), z.boolean(), z.null()]),
  )
  .refine((val) => Object.keys(val).length <= 10, "Too many clientMeta keys")
  .optional();

const SessionCreateSchema = z
  .object({
    clientMeta: ClientMetaSchema,
  })
  .optional();

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    if (!isValidPublicTokenShape(token)) {
      return apiError(404, "not_found", "QR code not found");
    }

    const rate = await enforcePublicRateLimit({
      scope: "session",
      ip: getClientIp(request),
      token,
    });
    if (!rate.success) return rateLimitedResponse(rate);

    const service = createServiceClient();
    const resolved = await resolveActiveQrByToken(service, token);

    let clientMeta: Record<string, unknown> = {};
    try {
      const json: unknown = await parseJsonBody(request);
      const parsed = SessionCreateSchema.safeParse(json);
      if (parsed.success && parsed.data?.clientMeta) {
        clientMeta = parsed.data.clientMeta;
      }
    } catch (err) {
      if (err instanceof PayloadTooLargeError) {
        return apiError(413, "payload_too_large", err.message);
      }
      // Empty or non-JSON body is allowed on session start
    }

    const session = await createFeedbackSession(service, {
      businessId: resolved.businessId,
      qrCodeId: resolved.qrCodeId,
      clientMeta,
    });

    await recordAnalyticsEvent(service, {
      businessId: resolved.businessId,
      qrCodeId: resolved.qrCodeId,
      feedbackSessionId: session.id,
      eventType: "session_started",
    });

    return apiOk(
      {
        sessionId: session.id,
        expiresAt: session.expires_at,
        status: session.status,
      },
      201,
    );
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
    return internalError(error, "session_failed");
  }
}

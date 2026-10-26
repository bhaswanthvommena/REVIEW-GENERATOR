import { apiError, apiOk, internalError } from "@/lib/api/errors";
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

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    if (!isValidPublicTokenShape(token)) {
      return apiError(404, "not_found", "QR code not found");
    }

    const service = createServiceClient();
    const resolved = await resolveActiveQrByToken(service, token);

    let clientMeta: Record<string, unknown> = {};
    try {
      const json = (await request.json()) as { clientMeta?: Record<string, unknown> };
      if (json.clientMeta && typeof json.clientMeta === "object") {
        clientMeta = json.clientMeta;
      }
    } catch {
      // empty body ok
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
    if (error instanceof QrNotFoundError) {
      return apiError(404, "not_found", error.message);
    }
    if (error instanceof QrInactiveError) {
      return apiError(410, "qr_inactive", error.message);
    }
    return internalError(error, "session_failed");
  }
}

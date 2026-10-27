import { apiError, apiOk, internalError } from "@/lib/api/errors";
import {
  enforcePublicRateLimit,
  getClientIp,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/server";
import { recordAnalyticsEvent } from "@/modules/analytics";
import {
  isValidPublicTokenShape,
  QrInactiveError,
  QrNotFoundError,
  resolveActiveQrByToken,
} from "@/modules/qr";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    if (!isValidPublicTokenShape(token)) {
      return apiError(404, "not_found", "QR code not found");
    }

    const rate = await enforcePublicRateLimit({
      scope: "scan",
      ip: getClientIp(request),
      token,
    });
    if (!rate.success) return rateLimitedResponse(rate);

    const service = createServiceClient();
    const resolved = await resolveActiveQrByToken(service, token);

    const emitScan = new URL(request.url).searchParams.get("scan") !== "0";
    if (emitScan) {
      await recordAnalyticsEvent(service, {
        businessId: resolved.businessId,
        qrCodeId: resolved.qrCodeId,
        eventType: "qr_scan",
      });
    }

    return apiOk({
      businessName: resolved.businessName,
      businessId: resolved.businessId,
      qrCodeId: resolved.qrCodeId,
      googleReviewUrl: resolved.googleReviewUrl,
      attributes: resolved.attributes,
      fields: resolved.fields,
      // Product lock: Google path is never gated by ratings.
      googleCtaPolicy: "always_available_no_rating_gate",
    });
  } catch (error) {
    if (error instanceof QrNotFoundError) {
      return apiError(404, "not_found", error.message);
    }
    if (error instanceof QrInactiveError) {
      return apiError(410, "qr_inactive", error.message);
    }
    return internalError(error, "internal_error");
  }
}

import { ZodError } from "zod";
import { apiError, apiOk } from "@/lib/api/errors";
import {
  enforceDraftRateLimits,
  getClientIp,
} from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/server";
import {
  createDraftForSession,
  DraftCreateSchema,
  DraftGenerationError,
} from "@/modules/ai";
import { recordAnalyticsEvent } from "@/modules/analytics";
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

    const json: unknown = await request.json();
    const input = DraftCreateSchema.parse(json);

    const service = createServiceClient();
    const resolved = await resolveActiveQrByToken(service, token);

    const rate = await enforceDraftRateLimits({
      ip: getClientIp(request),
      token,
      businessId: resolved.businessId,
    });
    if (!rate.success) {
      const retryAfter = Math.max(
        1,
        Math.ceil((rate.reset - Date.now()) / 1000),
      );
      const response = apiError(
        429,
        "rate_limited",
        "Too many draft requests. Try again shortly.",
        { retryAfter },
      );
      response.headers.set("Retry-After", String(retryAfter));
      return response;
    }

    const { data: session } = await service
      .from("feedback_sessions")
      .select("id, business_id, qr_code_id, status")
      .eq("id", input.feedbackSessionId)
      .maybeSingle();

    if (
      !session ||
      session.business_id !== resolved.businessId ||
      session.qr_code_id !== resolved.qrCodeId
    ) {
      return apiError(400, "session_invalid", "Session does not match this QR.");
    }

    const { draft, generated } = await createDraftForSession(
      service,
      input.feedbackSessionId,
      { regenerate: input.regenerate },
    );

    await recordAnalyticsEvent(service, {
      businessId: resolved.businessId,
      qrCodeId: resolved.qrCodeId,
      feedbackSessionId: session.id,
      eventType: "draft_generated",
      props: {
        regenerate: Boolean(input.regenerate),
        model: generated.model,
        promptVersion: generated.promptVersion,
      },
    });

    return apiOk(
      {
        draft: {
          id: draft.id,
          text: draft.draft_text,
          model: draft.model,
          promptVersion: draft.prompt_version,
          warnings: generated.warnings,
        },
        // Product lock: never gate Google on ratings or draft quality.
        googleReviewUrl: resolved.googleReviewUrl,
        googleCtaPolicy: "always_available_no_rating_gate",
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
    if (error instanceof ZodError) {
      return apiError(400, "validation_error", "Invalid draft payload", error.issues);
    }
    if (error instanceof DraftGenerationError) {
      return apiError(502, "draft_failed", error.message);
    }
    if (error instanceof Error) {
      if (error.message === "SESSION_NOT_FOUND") {
        return apiError(404, "session_not_found", "Feedback session not found");
      }
      if (error.message === "SESSION_NOT_READY") {
        return apiError(
          400,
          "session_not_ready",
          "Submit ratings before generating a draft",
        );
      }
      if (error.message === "Missing GEMINI_API_KEY") {
        return apiError(503, "gemini_unconfigured", "AI drafting is not configured");
      }
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return apiError(500, "internal_error", message);
  }
}

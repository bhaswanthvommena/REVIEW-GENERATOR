import { after } from "next/server";
import { ZodError } from "zod";
import { apiError, apiOk, internalError } from "@/lib/api/errors";
import {
  enforceDraftRateLimits,
  getClientIp,
} from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/server";
import {
  createDraftForSession,
  DraftCreateSchema,
  DraftLimitError,
  markSessionDrafted,
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
  const tStart = performance.now();
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

    const tResolved = performance.now();
    const { draft, generated, sessionId, timings } = await createDraftForSession(
      service,
      input.feedbackSessionId,
      {
        regenerate: input.regenerate,
        expect: {
          businessId: resolved.businessId,
          qrCodeId: resolved.qrCodeId,
        },
      },
    );

    // The customer does not need to wait for bookkeeping.
    after(async () => {
      await Promise.allSettled([
        markSessionDrafted(service, sessionId),
        recordAnalyticsEvent(service, {
          businessId: resolved.businessId,
          qrCodeId: resolved.qrCodeId,
          feedbackSessionId: sessionId,
          eventType: "draft_generated",
          props: {
            regenerate: Boolean(input.regenerate),
            model: generated.model,
            promptVersion: generated.promptVersion,
          },
        }),
      ]);
    });

    // Stage timings only; no tokens, ids, or customer text.
    console.info("draft_timing", {
      ...timings,
      beforeDraftMs: Math.round(tResolved - tStart),
      totalMs: Math.round(performance.now() - tStart),
      retries: generated.validation.retries,
      regenerate: Boolean(input.regenerate),
      model: generated.model,
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
    if (error instanceof DraftLimitError) {
      return apiError(429, "draft_limit", error.message);
    }
    if (error instanceof DraftGenerationError) {
      return apiError(502, "draft_failed", error.message);
    }
    if (error instanceof Error) {
      if (error.message === "SESSION_MISMATCH") {
        return apiError(400, "session_invalid", "Session does not match this QR.");
      }
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
    return internalError(error, "internal_error");
  }
}

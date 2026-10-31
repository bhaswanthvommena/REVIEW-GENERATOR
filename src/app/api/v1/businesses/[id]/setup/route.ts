import { ZodError } from "zod";
import { parseJsonBody, PayloadTooLargeError, UnsupportedMediaTypeError } from "@/lib/api/body";
import { apiError, apiOk, internalError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import {
  BusinessSetupSchema,
  getBusinessForOwner,
  saveBusinessSetup,
  SetupConflictError,
} from "@/modules/businesses";
import { listQrCodesForBusiness, replaceActiveQrCode } from "@/modules/qr";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Save profile, customer fields, and rating questions in one request.
 * Existing active QR codes are preserved so printed signs and cards remain valid.
 * A new QR code is only minted if the business has no active code yet.
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const user = await requireUser(supabase);
    const existing = await getBusinessForOwner(supabase, id, user.id);
    if (!existing) {
      return apiError(404, "not_found", "Business not found");
    }

    const json: unknown = await parseJsonBody(request);
    const input = BusinessSetupSchema.parse(json);
    await saveBusinessSetup(supabase, id, input);

    // Safeguard printed QR codes: never revoke an existing active QR on profile update.
    // Only mint a new code if no active QR code exists for this business yet.
    const codes = await listQrCodesForBusiness(supabase, id);
    const hasActiveQr = codes.some((code) => code.is_active);
    let qrCreated = false;
    if (!hasActiveQr) {
      await replaceActiveQrCode(supabase, id);
      qrCreated = true;
    }
    return apiOk({ ok: true, qrReplaced: qrCreated });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return apiError(413, "payload_too_large", error.message);
    }
    if (error instanceof UnsupportedMediaTypeError) {
      return apiError(415, "unsupported_media_type", error.message);
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return apiError(401, "unauthorized", "Sign in required");
    }
    if (error instanceof ZodError) {
      return apiError(
        400,
        "validation_error",
        error.issues[0]?.message ?? "Check the highlighted fields",
        error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
      );
    }
    if (error instanceof SetupConflictError) {
      return apiError(409, "conflict", error.message);
    }
    return internalError(error, "save_failed");
  }
}

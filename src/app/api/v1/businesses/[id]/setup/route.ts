import { ZodError } from "zod";
import { apiError, apiOk } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import {
  BusinessSetupSchema,
  getBusinessForOwner,
  saveBusinessSetup,
  SetupConflictError,
  type Business,
  type BusinessSetupInput,
} from "@/modules/businesses";
import { listQrCodesForBusiness, replaceActiveQrCode } from "@/modules/qr";

type RouteContext = { params: Promise<{ id: string }> };

/** Save profile, customer fields and rating questions in one request. */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const user = await requireUser(supabase);
    const existing = await getBusinessForOwner(supabase, id, user.id);
    if (!existing) {
      return apiError(404, "not_found", "Business not found");
    }

    const json: unknown = await request.json();
    const input = BusinessSetupSchema.parse(json);
    const profileChanged = profileDiffers(existing, input);
    await saveBusinessSetup(supabase, id, input);

    const codes = await listQrCodesForBusiness(supabase, id);
    const qrReplaced = profileChanged || !codes.some((code) => code.is_active);
    if (qrReplaced) {
      await replaceActiveQrCode(supabase, id);
    }
    return apiOk({ ok: true, qrReplaced });
  } catch (error) {
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
    console.error("save_business_setup failed", error);
    return apiError(500, "save_failed", "Something went wrong, please try again.");
  }
}

function blank(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** True when the printed-code details (name, place, link) actually changed. */
function profileDiffers(existing: Business, input: BusinessSetupInput): boolean {
  return (
    blank(existing.name) !== blank(input.name) ||
    blank(existing.category) !== blank(input.category) ||
    blank(existing.location) !== blank(input.location) ||
    blank(existing.description) !== blank(input.description) ||
    blank(existing.google_review_url) !== blank(input.googleReviewUrl)
  );
}

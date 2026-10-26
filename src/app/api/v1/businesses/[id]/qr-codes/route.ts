import { ZodError } from "zod";
import { apiError, apiOk, internalError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { getBusinessForOwner } from "@/modules/businesses";
import {
  buildPublicFeedbackUrl,
  createQrCode,
  listQrCodesForBusiness,
  QrCreateSchema,
} from "@/modules/qr";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: businessId } = await context.params;
    const supabase = await createClient();
    const user = await requireUser(supabase);
    const business = await getBusinessForOwner(supabase, businessId, user.id);
    if (!business) {
      return apiError(404, "not_found", "Business not found");
    }
    const codes = await listQrCodesForBusiness(supabase, businessId);
    return apiOk({
      qrCodes: codes.map((qr) => ({
        ...qr,
        publicUrl: buildPublicFeedbackUrl(qr.public_token),
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return apiError(401, "unauthorized", "Sign in required");
    }
    return internalError(error, "internal_error");
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: businessId } = await context.params;
    const supabase = await createClient();
    const user = await requireUser(supabase);
    const business = await getBusinessForOwner(supabase, businessId, user.id);
    if (!business) {
      return apiError(404, "not_found", "Business not found");
    }
    const json: unknown = await request.json().catch(() => ({}));
    const input = QrCreateSchema.parse(json);
    const qrCode = await createQrCode(supabase, businessId, input);
    return apiOk({ qrCode }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return apiError(401, "unauthorized", "Sign in required");
    }
    if (error instanceof ZodError) {
      return apiError(400, "validation_error", "Invalid QR payload", error.issues);
    }
    return internalError(error, "create_failed");
  }
}

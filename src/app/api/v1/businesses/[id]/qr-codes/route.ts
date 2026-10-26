import { apiError, apiOk, internalError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { getBusinessForOwner } from "@/modules/businesses";
import {
  buildPublicFeedbackUrl,
  listQrCodesForBusiness,
  replaceActiveQrCode,
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

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id: businessId } = await context.params;
    const supabase = await createClient();
    const user = await requireUser(supabase);
    const business = await getBusinessForOwner(supabase, businessId, user.id);
    if (!business) {
      return apiError(404, "not_found", "Business not found");
    }
    const qrCode = await replaceActiveQrCode(supabase, businessId);
    return apiOk({ qrCode }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return apiError(401, "unauthorized", "Sign in required");
    }
    return internalError(error, "create_failed");
  }
}

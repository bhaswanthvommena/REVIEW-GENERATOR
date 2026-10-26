import { z, ZodError } from "zod";
import { apiError, apiOk, internalError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { getBusinessForOwner } from "@/modules/businesses";
import { deactivateQrCode } from "@/modules/qr";

type RouteContext = { params: Promise<{ id: string }> };

const BodySchema = z.object({
  businessId: z.string().uuid(),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: qrCodeId } = await context.params;
    const supabase = await createClient();
    const user = await requireUser(supabase);
    const json: unknown = await request.json();
    const { businessId } = BodySchema.parse(json);
    const business = await getBusinessForOwner(supabase, businessId, user.id);
    if (!business) {
      return apiError(404, "not_found", "Business not found");
    }
    const qrCode = await deactivateQrCode(supabase, qrCodeId, businessId);
    return apiOk({ qrCode });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return apiError(401, "unauthorized", "Sign in required");
    }
    if (error instanceof ZodError) {
      return apiError(400, "validation_error", "Invalid deactivate payload", error.issues);
    }
    return internalError(error, "deactivate_failed");
  }
}

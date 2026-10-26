import { apiError, apiOk, internalError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import { getFunnelSummaryForBusiness } from "@/modules/analytics";
import { requireUser } from "@/modules/auth";
import { getBusinessForOwner } from "@/modules/businesses";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id: businessId } = await context.params;
    const supabase = await createClient();
    const user = await requireUser(supabase);
    const business = await getBusinessForOwner(supabase, businessId, user.id);
    if (!business) {
      return apiError(404, "not_found", "Business not found");
    }

    const { searchParams } = new URL(request.url);
    const summary = await getFunnelSummaryForBusiness(supabase, businessId, {
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    });

    return apiOk({
      businessId,
      businessName: business.name,
      funnel: summary,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return apiError(401, "unauthorized", "Sign in required");
    }
    if (error instanceof Error && error.message === "INVALID_DATE_RANGE") {
      return apiError(400, "invalid_date_range", "Invalid from/to date range");
    }
    return internalError(error, "internal_error");
  }
}

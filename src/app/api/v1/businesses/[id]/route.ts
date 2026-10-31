import { ZodError } from "zod";
import {
  parseJsonBody,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
} from "@/lib/api/body";
import { apiError, apiOk, internalError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import {
  BusinessUpdateSchema,
  getBusinessForOwner,
  updateBusiness,
} from "@/modules/businesses";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const user = await requireUser(supabase);
    const business = await getBusinessForOwner(supabase, id, user.id);
    if (!business) {
      return apiError(404, "not_found", "Business not found");
    }
    return apiOk({ business });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return apiError(401, "unauthorized", "Sign in required");
    }
    return internalError(error, "internal_error");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const user = await requireUser(supabase);
    const existing = await getBusinessForOwner(supabase, id, user.id);
    if (!existing) {
      return apiError(404, "not_found", "Business not found");
    }
    const json: unknown = await parseJsonBody(request);
    const input = BusinessUpdateSchema.parse(json);
    const business = await updateBusiness(supabase, id, user.id, input);
    return apiOk({ business });
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
      return apiError(400, "validation_error", "Invalid business payload", error.issues);
    }
    return internalError(error, "update_failed");
  }
}

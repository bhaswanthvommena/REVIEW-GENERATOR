import { ZodError } from "zod";
import {
  parseJsonBody,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
} from "@/lib/api/body";
import { apiError, apiOk, internalError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import {
  AttributeCreateSchema,
  createAttribute,
  listAttributesForBusiness,
} from "@/modules/attributes";
import { requireUser } from "@/modules/auth";
import { getBusinessForOwner } from "@/modules/businesses";

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
    const attributes = await listAttributesForBusiness(supabase, businessId);
    return apiOk({ attributes });
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
    const json: unknown = await parseJsonBody(request);
    const input = AttributeCreateSchema.parse(json);
    const attribute = await createAttribute(supabase, businessId, input);
    return apiOk({ attribute }, 201);
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
      return apiError(400, "validation_error", "Invalid attribute payload", error.issues);
    }
    return internalError(error, "create_failed");
  }
}

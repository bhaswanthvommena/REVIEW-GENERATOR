import { ZodError, z } from "zod";
import {
  parseJsonBody,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
} from "@/lib/api/body";
import { apiError, apiOk, internalError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { getBusinessForOwner } from "@/modules/businesses";
import {
  deleteField,
  FieldNameTakenError,
  FieldNotFoundError,
  FieldUpdateSchema,
  updateField,
} from "@/modules/fields";

type RouteContext = { params: Promise<{ id: string }> };

const FieldIdSchema = z.string().uuid();

const PatchBodySchema = z.object({
  businessId: z.string().uuid(),
  patch: FieldUpdateSchema,
});

const DeleteBodySchema = z.object({
  businessId: z.string().uuid(),
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const fieldId = FieldIdSchema.parse(id);
    const supabase = await createClient();
    const user = await requireUser(supabase);
    const json: unknown = await parseJsonBody(request);
    const { businessId, patch } = PatchBodySchema.parse(json);
    const business = await getBusinessForOwner(supabase, businessId, user.id);
    if (!business) {
      return apiError(404, "not_found", "Business not found");
    }
    const field = await updateField(supabase, fieldId, businessId, patch);
    return apiOk({ field });
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
      return apiError(400, "validation_error", "Invalid field payload", error.issues);
    }
    if (error instanceof FieldNotFoundError) {
      return apiError(404, "not_found", error.message);
    }
    if (error instanceof FieldNameTakenError) {
      return apiError(409, "field_name_taken", error.message);
    }
    return internalError(error, "update_failed");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const fieldId = FieldIdSchema.parse(id);
    const supabase = await createClient();
    const user = await requireUser(supabase);
    let json: unknown;
    try {
      json = await parseJsonBody(request);
    } catch (err) {
      if (err instanceof PayloadTooLargeError || err instanceof UnsupportedMediaTypeError) {
        throw err;
      }
      json = {};
    }
    const { businessId } = DeleteBodySchema.parse(json);
    const business = await getBusinessForOwner(supabase, businessId, user.id);
    if (!business) {
      return apiError(404, "not_found", "Business not found");
    }
    await deleteField(supabase, fieldId, businessId);
    return apiOk({ ok: true });
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
      return apiError(400, "validation_error", "Invalid delete payload", error.issues);
    }
    if (error instanceof FieldNotFoundError) {
      return apiError(404, "not_found", error.message);
    }
    return internalError(error, "delete_failed");
  }
}

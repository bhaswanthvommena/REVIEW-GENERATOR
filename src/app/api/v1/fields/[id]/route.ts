import { ZodError, z } from "zod";
import { apiError, apiOk } from "@/lib/api/errors";
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
    const json: unknown = await request.json();
    const { businessId, patch } = PatchBodySchema.parse(json);
    const business = await getBusinessForOwner(supabase, businessId, user.id);
    if (!business) {
      return apiError(404, "not_found", "Business not found");
    }
    const field = await updateField(supabase, fieldId, businessId, patch);
    return apiOk({ field });
  } catch (error) {
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return apiError(400, "update_failed", message);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const fieldId = FieldIdSchema.parse(id);
    const supabase = await createClient();
    const user = await requireUser(supabase);
    const json: unknown = await request.json().catch(() => ({}));
    const { businessId } = DeleteBodySchema.parse(json);
    const business = await getBusinessForOwner(supabase, businessId, user.id);
    if (!business) {
      return apiError(404, "not_found", "Business not found");
    }
    await deleteField(supabase, fieldId, businessId);
    return apiOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return apiError(401, "unauthorized", "Sign in required");
    }
    if (error instanceof ZodError) {
      return apiError(400, "validation_error", "Invalid delete payload", error.issues);
    }
    if (error instanceof FieldNotFoundError) {
      return apiError(404, "not_found", error.message);
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return apiError(400, "delete_failed", message);
  }
}

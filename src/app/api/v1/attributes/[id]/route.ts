import { ZodError, z } from "zod";
import { apiError, apiOk, internalError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import { deleteAttribute, updateAttribute } from "@/modules/attributes";
import { requireUser } from "@/modules/auth";
import { getBusinessForOwner } from "@/modules/businesses";

type RouteContext = { params: Promise<{ id: string }> };

const PatchBodySchema = z
  .object({
    businessId: z.string().uuid(),
    label: z.string().trim().min(1).max(80).optional(),
    displayOrder: z.number().int().min(0).max(1000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.label !== undefined ||
      value.displayOrder !== undefined ||
      value.isActive !== undefined,
    { message: "At least one attribute field is required" },
  );

const DeleteBodySchema = z.object({
  businessId: z.string().uuid(),
});

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: attributeId } = await context.params;
    const supabase = await createClient();
    const user = await requireUser(supabase);
    const json: unknown = await request.json();
    const parsed = PatchBodySchema.parse(json);
    const business = await getBusinessForOwner(
      supabase,
      parsed.businessId,
      user.id,
    );
    if (!business) {
      return apiError(404, "not_found", "Business not found");
    }
    const attribute = await updateAttribute(
      supabase,
      attributeId,
      parsed.businessId,
      {
        label: parsed.label,
        displayOrder: parsed.displayOrder,
        isActive: parsed.isActive,
      },
    );
    return apiOk({ attribute });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return apiError(401, "unauthorized", "Sign in required");
    }
    if (error instanceof ZodError) {
      return apiError(400, "validation_error", "Invalid attribute payload", error.issues);
    }
    return internalError(error, "update_failed");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id: attributeId } = await context.params;
    const supabase = await createClient();
    const user = await requireUser(supabase);
    const json: unknown = await request.json().catch(() => ({}));
    const { businessId } = DeleteBodySchema.parse(json);
    const business = await getBusinessForOwner(supabase, businessId, user.id);
    if (!business) {
      return apiError(404, "not_found", "Business not found");
    }
    await deleteAttribute(supabase, attributeId, businessId);
    return apiOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return apiError(401, "unauthorized", "Sign in required");
    }
    if (error instanceof ZodError) {
      return apiError(400, "validation_error", "Invalid delete payload", error.issues);
    }
    return internalError(error, "delete_failed");
  }
}

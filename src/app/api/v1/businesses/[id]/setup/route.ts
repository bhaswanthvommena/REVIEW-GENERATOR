import { ZodError } from "zod";
import { apiError, apiOk } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import {
  BusinessSetupSchema,
  getBusinessForOwner,
  saveBusinessSetup,
  SetupConflictError,
} from "@/modules/businesses";

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
    await saveBusinessSetup(supabase, id, input);
    return apiOk({ ok: true });
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

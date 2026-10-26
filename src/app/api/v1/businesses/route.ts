import { ZodError } from "zod";
import { apiError, apiOk, internalError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import {
  BusinessCreateSchema,
  createBusiness,
  listBusinessesForOwner,
} from "@/modules/businesses";

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);
    const businesses = await listBusinessesForOwner(supabase, user.id);
    return apiOk({ businesses });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return apiError(401, "unauthorized", "Sign in required");
    }
    return internalError(error, "internal_error");
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);
    const json: unknown = await request.json();
    const input = BusinessCreateSchema.parse(json);
    const business = await createBusiness(supabase, user.id, input);
    return apiOk({ business }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return apiError(401, "unauthorized", "Sign in required");
    }
    if (error instanceof ZodError) {
      return apiError(400, "validation_error", "Invalid business payload", error.issues);
    }
    return internalError(error, "create_failed");
  }
}

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
  BusinessCreateSchema,
  createBusiness,
  listBusinessesForOwner,
} from "@/modules/businesses";
import { replaceActiveQrCode } from "@/modules/qr";

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
    const json: unknown = await parseJsonBody(request);
    const input = BusinessCreateSchema.parse(json);
    const business = await createBusiness(supabase, user.id, input);
    try {
      await replaceActiveQrCode(supabase, business.id);
    } catch (qrError) {
      console.error("qr_create_failed", qrError);
    }
    return apiOk({ business }, 201);
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
    return internalError(error, "create_failed");
  }
}

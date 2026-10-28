import { z, ZodError } from "zod";
import { apiError, internalError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { getBusinessForOwner } from "@/modules/businesses";
import {
  buildPublicFeedbackUrl,
  getQrCodeForOwner,
  QrFormatSchema,
  qrDownloadFilename,
  renderQr,
} from "@/modules/qr";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id: qrCodeId } = await context.params;
    const { searchParams } = new URL(request.url);
    const businessId = z.string().uuid().parse(searchParams.get("businessId"));
    const format = QrFormatSchema.parse(searchParams.get("format") ?? "png");

    const supabase = await createClient();
    const user = await requireUser(supabase);
    const business = await getBusinessForOwner(supabase, businessId, user.id);
    if (!business) {
      return apiError(404, "not_found", "Business not found");
    }

    const qr = await getQrCodeForOwner(supabase, qrCodeId, businessId);
    if (!qr) {
      return apiError(404, "not_found", "QR code not found");
    }

    const publicUrl = buildPublicFeedbackUrl(qr.public_token);
    const rendered = await renderQr(publicUrl, format, business.name);
    const filename = qrDownloadFilename(business.name, format);

    return new Response(rendered.body, {
      status: 200,
      headers: {
        "Content-Type": rendered.contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return apiError(401, "unauthorized", "Sign in required");
    }
    if (error instanceof ZodError) {
      return apiError(400, "validation_error", "Invalid download request", error.issues);
    }
    return internalError(error, "download_failed");
  }
}

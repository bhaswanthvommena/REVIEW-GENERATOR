import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPublicFeedbackUrl, generatePublicToken } from "./token";
import type { QrCreateInput } from "./schemas";
import type { PublicQrResolve, QrCode } from "./types";

export class QrInactiveError extends Error {
  constructor(message = "This QR code is no longer active.") {
    super(message);
    this.name = "QrInactiveError";
  }
}

export class QrNotFoundError extends Error {
  constructor(message = "QR code not found.") {
    super(message);
    this.name = "QrNotFoundError";
  }
}

export async function listQrCodesForBusiness(
  supabase: SupabaseClient,
  businessId: string,
): Promise<QrCode[]> {
  const { data, error } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as QrCode[];
}

export async function createQrCode(
  supabase: SupabaseClient,
  businessId: string,
  input: QrCreateInput = {},
): Promise<QrCode & { publicUrl: string }> {
  const public_token = generatePublicToken();
  const { data, error } = await supabase
    .from("qr_codes")
    .insert({
      business_id: businessId,
      public_token,
      label: input.label ?? null,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const qr = data as QrCode;
  return { ...qr, publicUrl: buildPublicFeedbackUrl(qr.public_token) };
}

export async function getQrCodeForOwner(
  supabase: SupabaseClient,
  qrCodeId: string,
  businessId: string,
): Promise<QrCode | null> {
  const { data, error } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("id", qrCodeId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return (data as QrCode | null) ?? null;
}

export async function deactivateQrCode(
  supabase: SupabaseClient,
  qrCodeId: string,
  businessId: string,
): Promise<QrCode> {
  const { data, error } = await supabase
    .from("qr_codes")
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
    })
    .eq("id", qrCodeId)
    .eq("business_id", businessId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as QrCode;
}

/** Resolve public token with service-role client (bypasses RLS). */
export async function resolveActiveQrByToken(
  service: SupabaseClient,
  token: string,
): Promise<PublicQrResolve> {
  const { data: qr, error: qrError } = await service
    .from("qr_codes")
    .select("id, business_id, is_active, revoked_at")
    .eq("public_token", token)
    .maybeSingle();

  if (qrError) {
    throw new Error(qrError.message);
  }
  if (!qr) {
    throw new QrNotFoundError();
  }
  if (!qr.is_active || qr.revoked_at) {
    throw new QrInactiveError();
  }

  const { data: business, error: businessError } = await service
    .from("businesses")
    .select("id, name, google_review_url")
    .eq("id", qr.business_id)
    .single();

  if (businessError || !business) {
    throw new QrNotFoundError("Business not found for this QR.");
  }

  const { data: attributes, error: attrError } = await service
    .from("rating_attributes")
    .select("id, label, display_order")
    .eq("business_id", business.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (attrError) {
    throw new Error(attrError.message);
  }

  return {
    qrCodeId: qr.id as string,
    businessId: business.id as string,
    businessName: business.name as string,
    googleReviewUrl: business.google_review_url as string,
    attributes: (attributes ?? []).map((row) => ({
      id: row.id as string,
      label: row.label as string,
      displayOrder: row.display_order as number,
    })),
  };
}

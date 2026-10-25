export type QrCode = {
  id: string;
  business_id: string;
  public_token: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
  revoked_at: string | null;
};

export type PublicQrResolve = {
  qrCodeId: string;
  businessId: string;
  businessName: string;
  googleReviewUrl: string;
  attributes: Array<{
    id: string;
    label: string;
    displayOrder: number;
  }>;
};

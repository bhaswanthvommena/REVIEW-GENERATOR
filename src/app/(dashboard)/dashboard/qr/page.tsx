import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { listBusinessesForOwner } from "@/modules/businesses";
import { buildPublicFeedbackUrl, listQrCodesForBusiness } from "@/modules/qr";
import { QrManager } from "./qr-manager";

export default async function QrPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const businesses = await listBusinessesForOwner(supabase, user.id);
  const business = businesses[0] ?? null;

  if (!business) {
    return (
      <EmptyState
        title="Create a business first"
        description="QR codes belong to a business. Add the profile, then come back to print a code."
        action={
          <Link href="/dashboard/business" className={buttonVariants()}>
            Create business
          </Link>
        }
      />
    );
  }

  const qrCodes = await listQrCodesForBusiness(supabase, business.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="QR code"
        description={`For ${business.name}. The PDF is ready to print, and the business name is on the card so two codes are easy to tell apart.`}
      />
      <QrManager
        businessId={business.id}
        businessName={business.name}
        initial={(() => {
          const qr = qrCodes.find((code) => code.is_active);
          if (!qr) return null;
          return {
            id: qr.id,
            label: qr.label,
            is_active: qr.is_active,
            publicUrl: buildPublicFeedbackUrl(qr.public_token),
            created_at: qr.created_at,
            revoked_at: qr.revoked_at,
          };
        })()}
      />
    </div>
  );
}

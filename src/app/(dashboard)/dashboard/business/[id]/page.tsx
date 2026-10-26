import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listAttributesForBusiness } from "@/modules/attributes";
import { requireUser } from "@/modules/auth";
import { getBusinessForOwner } from "@/modules/businesses";
import { listFieldsForBusiness } from "@/modules/fields";
import { listQrCodesForBusiness } from "@/modules/qr";
import { BusinessForm } from "../business-form";
import { AttributesManager } from "./attributes-manager";
import { FieldsManager } from "./fields-manager";

type PageProps = { params: Promise<{ id: string }> };

export default async function BusinessDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const business = await getBusinessForOwner(supabase, id, user.id);
  if (!business) {
    notFound();
  }
  const [attributes, fields, qrCodes] = await Promise.all([
    listAttributesForBusiness(supabase, id),
    listFieldsForBusiness(supabase, id),
    listQrCodesForBusiness(supabase, id),
  ]);
  const hasQr = qrCodes.some((qr) => qr.is_active);

  return (
    <div className="space-y-6">
      <PageHeader
        title={business.name}
        description={
          hasQr
            ? "Your profile is saved. Share the QR so customers can write a review."
            : "Profile saved. Create a QR so customers can rate the visit and copy a draft."
        }
        actions={
          <Link href="/dashboard/qr" className={buttonVariants({ size: "lg", className: "sm:w-auto" })}>
            {hasQr ? "View your QR" : "Create your QR"}
          </Link>
        }
      />
      <BusinessForm
        businessId={business.id}
        initial={{
          name: business.name,
          slug: business.slug,
          category: business.category,
          description: business.description,
          googleReviewUrl: business.google_review_url,
        }}
      />
      <FieldsManager businessId={business.id} initial={fields} />
      <AttributesManager businessId={business.id} initial={attributes} />
    </div>
  );
}

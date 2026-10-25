import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listAttributesForBusiness } from "@/modules/attributes";
import { requireUser } from "@/modules/auth";
import { getBusinessForOwner } from "@/modules/businesses";
import { listQrCodesForBusiness } from "@/modules/qr";
import { BusinessForm } from "../business-form";
import { AttributesManager } from "./attributes-manager";

type PageProps = { params: Promise<{ id: string }> };

export default async function BusinessDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const business = await getBusinessForOwner(supabase, id, user.id);
  if (!business) {
    notFound();
  }
  const attributes = await listAttributesForBusiness(supabase, id);
  const qrCodes = await listQrCodesForBusiness(supabase, id);
  const hasQr = qrCodes.some((qr) => qr.is_active);

  return (
    <section className="space-y-8">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{business.name}</h2>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            {hasQr
              ? "Your profile is saved. Share the QR so customers can write a review."
              : "Profile saved. Create a QR so customers can rate and draft a review."}
          </p>
        </div>
        <Link
          href="/dashboard/qr"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-zinc-900 px-4 text-base font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          {hasQr ? "View your QR" : "Create your QR"}
        </Link>
      </div>

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

      <AttributesManager businessId={business.id} initial={attributes} />
    </section>
  );
}

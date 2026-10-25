import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listAttributesForBusiness } from "@/modules/attributes";
import { requireUser } from "@/modules/auth";
import { getBusinessForOwner } from "@/modules/businesses";
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

  return (
    <section className="space-y-10">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{business.name}</h2>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Settings and rating attributes. QR codes come in Phase 3.
        </p>
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

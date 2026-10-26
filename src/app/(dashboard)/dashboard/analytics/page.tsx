import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { getFunnelSummaryForBusiness } from "@/modules/analytics";
import { requireUser } from "@/modules/auth";
import { listBusinessesForOwner } from "@/modules/businesses";
import { AnalyticsFunnel } from "./analytics-funnel";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const businesses = await listBusinessesForOwner(supabase, user.id);
  const business = businesses[0] ?? null;

  if (!business) {
    return (
      <EmptyState
        title="Create a business to see the funnel"
        description="Scans, drafts, and Continue to Google clicks show up after the first QR is live."
        action={
          <Link href="/dashboard/business" className={buttonVariants()}>
            Create business
          </Link>
        }
      />
    );
  }

  const funnel = await getFunnelSummaryForBusiness(supabase, business.id, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Funnel"
        description={`For ${business.name}. These are click-through counts only — a Continue click is not a published Google review.`}
      />
      <AnalyticsFunnel businessId={business.id} initial={funnel} />
    </div>
  );
}

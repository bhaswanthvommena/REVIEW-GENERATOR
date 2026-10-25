import Link from "next/link";
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
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">Analytics</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Create a business to see funnel counts.{" "}
          <Link href="/dashboard/business" className="underline">
            Create business
          </Link>
        </p>
      </section>
    );
  }

  const funnel = await getFunnelSummaryForBusiness(supabase, business.id, {});

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Funnel analytics</h2>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          For <span className="font-medium">{business.name}</span>. Counts are
          click-through events only — we do not know if a Google review was
          published.
        </p>
      </div>
      <AnalyticsFunnel businessId={business.id} initial={funnel} />
    </section>
  );
}

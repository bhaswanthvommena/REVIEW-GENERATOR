import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { createClient } from "@/lib/supabase/server";
import { getFunnelSummaryForBusiness } from "@/modules/analytics";
import { requireUser } from "@/modules/auth";
import { listBusinessesForOwner } from "@/modules/businesses";
import { listQrCodesForBusiness } from "@/modules/qr";

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const businesses = await listBusinessesForOwner(supabase, user.id);
  const business = businesses[0] ?? null;

  const [qrCodes, funnel] = business
    ? await Promise.all([
        listQrCodesForBusiness(supabase, business.id),
        getFunnelSummaryForBusiness(supabase, business.id, {}),
      ])
    : [[], null];

  const hasQr = qrCodes.some((qr) => qr.is_active);
  const hasProfile = Boolean(business);
  const hasGoogleLink = Boolean(business?.google_review_url);
  const steps = [
    { label: "Business profile", done: hasProfile },
    { label: "Google review link", done: hasGoogleLink },
    { label: "QR code", done: hasQr },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  const progress = Math.round((doneCount / steps.length) * 100);

  const next = !hasProfile
    ? { href: "/dashboard/business", label: "Create your business" }
    : !hasGoogleLink
      ? { href: `/dashboard/business/${business!.id}`, label: "Add your Google link" }
      : { href: "/dashboard/qr", label: hasQr ? "View your QR" : "Create your QR" };

  const scans = funnel?.counts.qr_scan ?? 0;
  const drafts = funnel?.counts.draft_generated ?? 0;
  const clicks = funnel?.counts.google_continue_clicked ?? 0;
  const clickRate = scans === 0 ? "—" : `${Math.round((clicks / scans) * 100)}%`;

  return (
    <div className="space-y-8">
      <PageHeader
        title={business ? business.name : "Get your first QR"}
        description={
          hasQr
            ? "Customers scan the QR, rate the visit, and copy a draft onto Google."
            : "Three steps. Then customers can scan and write a review."
        }
        actions={
          <Link href={next.href} className={buttonVariants({ size: "lg", className: "sm:w-auto" })}>
            {next.label}
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <Card>
          <CardContent className="flex items-center gap-4">
            <ProgressRing value={progress} />
            <div>
              <p className="text-sm font-medium">Setup</p>
              <p className="text-sm text-muted-foreground">
                {doneCount} of {steps.length} done
              </p>
            </div>
          </CardContent>
        </Card>
        <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {steps.map((step, index) => (
            <li key={step.label} className="flex items-center gap-3 px-4 py-3">
              <span
                className={`flex size-7 items-center justify-center rounded-full text-sm ${
                  step.done
                    ? "bg-brand text-brand-foreground"
                    : "border border-border text-muted-foreground"
                }`}
                aria-hidden="true"
              >
                {step.done ? "✓" : index + 1}
              </span>
              <span>{step.label}</span>
              <span className="ml-auto text-sm text-muted-foreground">
                {step.done ? "Done" : "To do"}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Last 30 days</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="QR scans" value={String(scans)} />
          <StatCard label="Drafts" value={String(drafts)} />
          <StatCard label="Continue clicks" value={String(clicks)} hint="Not published reviews" />
          <StatCard label="Click rate" value={clickRate} hint="Continue clicks ÷ scans" />
        </div>
      </section>
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg viewBox="0 0 72 72" className="size-16 shrink-0" role="img" aria-label={`${value}% of setup complete`}>
      <circle cx="36" cy="36" r={radius} className="fill-none stroke-muted" strokeWidth="6" />
      <circle
        cx="36"
        cy="36"
        r={radius}
        className="fill-none stroke-brand"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="40" textAnchor="middle" className="fill-foreground text-[14px] font-semibold">
        {value}%
      </text>
    </svg>
  );
}

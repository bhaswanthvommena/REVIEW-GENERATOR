import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { listBusinessesForOwner } from "@/modules/businesses";
import { listQrCodesForBusiness } from "@/modules/qr";

const primaryClass =
  "inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-zinc-900 px-4 text-base font-medium text-white dark:bg-zinc-100 dark:text-zinc-900";

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const businesses = await listBusinessesForOwner(supabase, user.id);
  const business = businesses[0] ?? null;
  const qrCodes = business
    ? await listQrCodesForBusiness(supabase, business.id)
    : [];
  const hasQr = qrCodes.some((qr) => qr.is_active);
  const hasProfile = Boolean(business);
  const hasGoogleLink = Boolean(business?.google_review_url);

  const steps = [
    {
      label: "Business profile",
      done: hasProfile,
    },
    {
      label: "Google review link",
      done: hasGoogleLink,
    },
    {
      label: "QR code",
      done: hasQr,
    },
  ];

  const next = !hasProfile
    ? { href: "/dashboard/business", label: "Create your business" }
    : !hasGoogleLink
      ? {
          href: `/dashboard/business/${business!.id}`,
          label: "Add your Google link",
        }
      : !hasQr
        ? { href: "/dashboard/qr", label: "Create your QR" }
        : { href: "/dashboard/qr", label: "View your QR" };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {business ? business.name : "Get your first QR"}
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          {hasQr
            ? "Customers scan the QR, rate their visit, and copy a draft onto Google."
            : "Three steps. Then customers can scan and write a review."}
        </p>
      </div>

      <ol className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {steps.map((step, index) => (
          <li key={step.label} className="flex items-center gap-3 px-4 py-3">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${
                step.done
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-300 text-zinc-500 dark:border-zinc-700"
              }`}
              aria-hidden="true"
            >
              {step.done ? "✓" : index + 1}
            </span>
            <span className="text-base">{step.label}</span>
            <span className="ml-auto text-sm text-zinc-500">
              {step.done ? "Done" : "To do"}
            </span>
          </li>
        ))}
      </ol>

      <Link href={next.href} className={primaryClass}>
        {next.label}
      </Link>
    </section>
  );
}

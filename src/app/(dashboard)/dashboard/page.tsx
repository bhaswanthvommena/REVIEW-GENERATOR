import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { listBusinessesForOwner } from "@/modules/businesses";

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const businesses = await listBusinessesForOwner(supabase, user.id);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Create a business, paste your Google review URL, then manage rating
          attributes. QR and public feedback arrive in Phase 3.
        </p>
      </div>

      {businesses.length === 0 ? (
        <p className="text-sm">
          No business yet.{" "}
          <Link href="/dashboard/business" className="underline">
            Create one
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-3">
          {businesses.map((business) => (
            <li key={business.id} className="border-b border-zinc-200 pb-3 dark:border-zinc-800">
              <p className="font-medium">{business.name}</p>
              <p className="truncate text-sm text-zinc-500">
                {business.google_review_url}
              </p>
              <div className="mt-1 flex gap-3 text-sm">
                <Link
                  href={`/dashboard/business/${business.id}`}
                  className="underline"
                >
                  Settings & attributes
                </Link>
                <Link href="/dashboard/qr" className="underline">
                  QR codes
                </Link>
                <Link href="/dashboard/analytics" className="underline">
                  Analytics
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { listBusinessesForOwner } from "@/modules/businesses";
import { QrManager } from "./qr-manager";

export default async function QrPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const businesses = await listBusinessesForOwner(supabase, user.id);
  const business = businesses[0] ?? null;

  if (!business) {
    return (
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">QR codes</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Create a business first, then generate printable QR codes.{" "}
          <Link href="/dashboard/business" className="underline">
            Create business
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">QR codes</h2>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          For <span className="font-medium">{business.name}</span>. Each QR opens
          the public feedback page at <code className="text-sm">/r/:token</code>.
        </p>
      </div>
      <QrManager businessId={business.id} />
    </section>
  );
}

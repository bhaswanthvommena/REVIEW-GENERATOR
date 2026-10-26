import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/dashboard/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/modules/auth";
import { listBusinessesForOwner } from "@/modules/businesses";

/** Owner session via cookies — allowed to block instant navigation. */
export const instant = false;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardSession>{children}</DashboardSession>
    </Suspense>
  );
}

function DashboardFallback() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <div className="hidden border-r border-border p-4 md:block">
        <Skeleton className="h-8 w-36" />
        <div className="mt-6 space-y-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
      <div className="px-4 py-6 md:px-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-32 w-full" />
      </div>
    </div>
  );
}

async function DashboardSession({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    redirect("/login");
  }

  const businesses = await listBusinessesForOwner(supabase, user.id);
  const business = businesses[0] ?? null;
  const setupHref = business ? `/dashboard/business/${business.id}` : "/dashboard/business";

  return (
    <AppShell
      setupHref={setupHref}
      email={user.email ?? user.id}
      businessName={business?.name ?? null}
    >
      {children}
    </AppShell>
  );
}

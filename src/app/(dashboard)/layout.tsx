import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/modules/auth";
import { listBusinessesForOwner } from "@/modules/businesses";
import { DashboardNav } from "./dashboard-nav";

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
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-5 pt-5 pb-28">
      <p className="text-base font-semibold tracking-tight">Review Generator</p>
      <p className="py-6 text-sm text-zinc-500">Loading your dashboard…</p>
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
  const setupHref = businesses[0]
    ? `/dashboard/business/${businesses[0].id}`
    : "/dashboard/business";

  return (
    <>
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-5 pt-5 pb-28">
        <header className="flex items-center justify-between gap-3">
          <p className="text-base font-semibold tracking-tight">
            Review Generator
          </p>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="min-h-11 px-2 text-sm text-zinc-600 dark:text-zinc-400"
            >
              Sign out
            </button>
          </form>
        </header>
        <div className="py-6">{children}</div>
        <p className="mt-auto text-xs text-zinc-500">
          Signed in as {user.email ?? user.id}
        </p>
      </div>
      <DashboardNav setupHref={setupHref} />
    </>
  );
}

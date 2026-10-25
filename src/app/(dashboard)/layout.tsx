import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/modules/auth";

/** Owner session via cookies — do not prerender as a static shell. */
export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-10">
      <header className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div>
          <p className="text-sm text-zinc-500">Review Generator</p>
          <h1 className="text-xl font-semibold tracking-tight">Owner dashboard</h1>
        </div>
        <nav className="flex gap-4 text-sm">
          <Link href="/dashboard" className="underline-offset-4 hover:underline">
            Overview
          </Link>
          <Link
            href="/dashboard/business"
            className="underline-offset-4 hover:underline"
          >
            Business
          </Link>
          <Link href="/dashboard/qr" className="underline-offset-4 hover:underline">
            QR
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="opacity-70 hover:opacity-100">
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <div className="py-8">{children}</div>
      <p className="mt-auto text-xs text-zinc-500">
        Signed in as {user.email ?? user.id}
      </p>
    </div>
  );
}

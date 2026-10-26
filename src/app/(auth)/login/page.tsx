import { ShieldCheck, Sparkles, QrCode } from "lucide-react";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { safeInternalPath } from "@/lib/url";

export const instant = false;

const points = [
  {
    icon: QrCode,
    title: "A QR for the counter",
    body: "Print it, share it, and turn it off when you want.",
  },
  {
    icon: Sparkles,
    title: "Drafts in their words",
    body: "Customers edit the draft, then copy it onto Google themselves.",
  },
  {
    icon: ShieldCheck,
    title: "No star gating",
    body: "Continue to Google stays available no matter the rating.",
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const nextPath = safeInternalPath(params.next);

  return (
    <main className="grid min-h-full flex-1 lg:grid-cols-2">
      <section className="flex flex-col px-6 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-semibold tracking-tight">Owner account</h1>
          <p className="mt-2 text-muted-foreground">
            Create an account or sign in. Customers never create accounts.
          </p>
          <div className="mt-8">
            <LoginForm
              nextPath={nextPath}
              authError={params.error === "auth"}
              initialMode={params.mode}
            />
          </div>
        </div>
      </section>
      <aside className="bg-mesh hidden border-l border-border lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-10">
        <p className="text-sm font-medium text-brand-800 dark:text-brand-200">
          For local businesses
        </p>
        <div>
          <h2 className="max-w-md text-4xl font-semibold tracking-tight">
            Reviews your customers actually wrote.
          </h2>
          <ul className="mt-10 space-y-6">
            {points.map((point) => (
              <li key={point.title} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card text-brand shadow-sm">
                  <point.icon className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-medium">{point.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{point.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-muted-foreground">
          We count Continue to Google clicks. We never claim a review was published.
        </p>
      </aside>
    </main>
  );
}

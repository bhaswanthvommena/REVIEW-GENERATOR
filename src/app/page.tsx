import {
  BarChart3,
  QrCode,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import Link from "next/link";
import { FaqList } from "@/components/marketing/faq-list";
import { HeroMock } from "@/components/marketing/hero-mock";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { buttonVariants } from "@/components/ui/button";

const steps = [
  {
    title: "Put a QR on the counter",
    body: "Print it or share the link. Customers open it on their phone. No app, no account.",
  },
  {
    title: "They rate the visit",
    body: "A few 1–5 questions you choose, plus an optional note. Nothing is pre-selected.",
  },
  {
    title: "They copy a draft onto Google",
    body: "Gemini writes a first-person draft they can edit. Continue to Google is always there.",
  },
];

const features = [
  {
    icon: Star,
    title: "Questions that fit the shop",
    body: "Start with service, quality, value, and atmosphere. Rename them, reorder them, or add your own.",
  },
  {
    icon: Sparkles,
    title: "Drafts they can edit",
    body: "The draft stays faithful to what they actually said. They change any line before copying.",
  },
  {
    icon: QrCode,
    title: "A QR you can print",
    body: "Label it for the front desk or the table tent. Download PNG or SVG, or turn it off later.",
  },
  {
    icon: BarChart3,
    title: "A funnel you can see",
    body: "Scans, drafts, copies, and Continue to Google clicks. We never claim a review was published.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="bg-mesh overflow-hidden border-b border-border">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-24">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                <ShieldCheck className="size-3.5 text-brand" aria-hidden="true" />
                Honest reviews. Never gated by stars.
              </p>
              <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                Turn visits into Google reviews
              </h1>
              <p className="mt-4 max-w-xl text-lg text-muted-foreground">
                Customers scan a QR, rate what mattered, and copy a draft written in their words.
                You never post for them.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/login" className={buttonVariants({ size: "lg", className: "sm:w-auto" })}>
                  Get started
                </Link>
                <a href="#how" className={buttonVariants({ variant: "outline", size: "lg", className: "sm:w-auto" })}>
                  See how it works
                </a>
              </div>
            </div>
            <HeroMock />
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Three steps from the counter to a review the customer actually wrote.
          </p>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <span className="flex size-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="features" className="border-y border-border bg-card/60">
          <div className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20">
            <h2 className="text-3xl font-semibold tracking-tight">Built for the counter, not a call center</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {features.map((feature) => (
                <article key={feature.title} className="rounded-2xl border border-border bg-background p-6">
                  <feature.icon className="size-5 text-brand" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="rounded-2xl border border-brand-200 bg-brand-50 px-6 py-8 dark:border-brand-900 dark:bg-brand-950">
            <h2 className="text-xl font-semibold tracking-tight">We never post for you</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Continue to Google is on screen for every customer, whatever they rated. Analytics
              count clicks only. A click is not a published review.
            </p>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-5 pb-20">
          <h2 className="text-3xl font-semibold tracking-tight">Questions</h2>
          <div className="mt-8">
            <FaqList />
          </div>
        </section>

        <section className="border-t border-border bg-mesh">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Put your first QR on the counter</h2>
              <p className="mt-2 text-muted-foreground">Create an owner account. Customers never do.</p>
            </div>
            <Link href="/login" className={buttonVariants({ size: "lg", className: "sm:w-auto" })}>
              Get started
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

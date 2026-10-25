import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Review Generator
      </h1>
      <p className="mt-3 max-w-md text-center text-zinc-600 dark:text-zinc-400">
        AI-assisted review drafts for local businesses. Owners manage Google
        review links and rating attributes; customers use a QR flow with Gemini
        drafts — never gated by stars.
      </p>
      <div className="mt-8 flex gap-4 text-sm">
        <Link
          href="/login"
          className="rounded bg-zinc-900 px-4 py-2.5 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Owner sign in
        </Link>
        <Link href="/dashboard" className="px-4 py-2.5 underline">
          Dashboard
        </Link>
      </div>
      <p className="mt-10 text-xs text-zinc-500">
        <Link href="/privacy" className="underline">
          Privacy
        </Link>
        {" · "}
        <Link href="/terms" className="underline">
          Terms
        </Link>
      </p>
    </main>
  );
}

import Link from "next/link";

export const metadata = {
  title: "Terms — Review Generator",
  description: "Terms of use stub for the Review Generator MVP.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-sm text-zinc-500">
        <Link href="/" className="underline">
          Review Generator
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Terms of use</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        This is an MVP stub, not a binding contract. Replace before production
        launch.
      </p>
      <ul className="mt-6 list-disc space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
        <li>
          The service helps customers draft reviews from their own ratings and
          comments. Customers must review drafts for accuracy before posting.
        </li>
        <li>
          We do not post reviews to Google on anyone’s behalf and do not store
          Google Business Profile OAuth credentials in this MVP.
        </li>
        <li>
          Do not use the product to solicit only positive reviews, offer
          incentives for reviews, or fabricate experiences.
        </li>
        <li>
          “Continue to Google” is always available and is never gated by star
          ratings.
        </li>
        <li>
          Abuse, automated scraping of tokens, or attempts to bypass rate limits
          may result in access being revoked.
        </li>
      </ul>
    </main>
  );
}

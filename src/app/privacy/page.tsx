import Link from "next/link";

export const metadata = {
  title: "Privacy — Review Generator",
  description: "Privacy stub for the Review Generator MVP.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-sm text-zinc-500">
        <Link href="/" className="underline">
          Review Generator
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Privacy</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        This is an MVP stub, not legal advice. Replace with counsel-reviewed
        policy before production launch.
      </p>
      <ul className="mt-6 list-disc space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
        <li>
          Business owners authenticate with Supabase Auth; account email is
          stored by the auth provider.
        </li>
        <li>
          Customers using a QR link do not create accounts. We store ratings,
          optional free-text comments, generated draft text, and anonymous
          analytics events tied to the business and QR token.
        </li>
        <li>
          We do not require customer email or phone for the public feedback
          flow.
        </li>
        <li>
          Draft generation uses Google Gemini on the server. Customer comments
          are sent to Gemini to produce editable drafts.
        </li>
        <li>
          Deleting a business cascades related feedback, drafts, QR codes, and
          analytics in the application database.
        </li>
        <li>
          Contact the business owner or the operator of this deployment for
          deletion requests until a formal DPO contact is published.
        </li>
      </ul>
    </main>
  );
}

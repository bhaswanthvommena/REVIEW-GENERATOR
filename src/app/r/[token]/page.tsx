import { Suspense } from "react";
import { PublicFeedbackFlow } from "./public-feedback-flow";

export const instant = false;

type PageProps = { params: Promise<{ token: string }> };

export default function PublicFeedbackPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-full w-full max-w-lg flex-col px-5 pt-6 pb-8">
          <p className="text-sm text-zinc-500">Loading…</p>
        </main>
      }
    >
      <PublicFeedback params={params} />
    </Suspense>
  );
}

async function PublicFeedback({ params }: PageProps) {
  const { token } = await params;
  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-col px-5 pt-6 pb-8">
      <PublicFeedbackFlow token={token} />
    </main>
  );
}

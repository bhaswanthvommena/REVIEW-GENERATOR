import { PublicFeedbackFlow } from "./public-feedback-flow";

export const instant = false;

type PageProps = { params: Promise<{ token: string }> };

export default async function PublicFeedbackPage({ params }: PageProps) {
  const { token } = await params;
  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-col px-5 pt-6 pb-8">
      <PublicFeedbackFlow token={token} />
    </main>
  );
}

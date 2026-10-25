import { apiOk } from "@/lib/api/errors";

export async function GET() {
  return apiOk({
    ok: true,
    service: "review-generator",
    phase: "phase-6-prod-hardening",
    locks: {
      geminiOnly: true,
      noOpenAI: true,
      noStripeCheckout: true,
      noReviewGating: true,
    },

  });
}

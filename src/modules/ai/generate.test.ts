import { describe, expect, it, vi } from "vitest";
import { generateReviewDraft } from "./generate";

vi.mock("@/lib/gemini", () => ({
  requireGeminiEnv: () => ({
    apiKey: "test-key",
    model: "gemini-3.8-flash",
  }),
  createGeminiClient: () => ({}),
}));

describe("generateReviewDraft (mocked Gemini)", () => {
  it("returns a validated draft from structured JSON", async () => {
    const result = await generateReviewDraft(
      {
        businessName: "Cafe Luna",
        ratings: [
          { label: "Overall experience", rating: 5 },
          { label: "Service", rating: 4 },
        ],
        comment: "Friendly barista and great espresso.",
      },
      {
        generate: async () => ({
          text: JSON.stringify({
            draft_text:
              "I had a lovely visit to Cafe Luna. The friendly barista made a great espresso and the service felt warm.",
            warnings: [],
          }),
          usage: { totalTokens: 120 },
        }),
      },
    );

    expect(result.promptVersion).toBe("review-draft/v1");
    expect(result.model).toBe("gemini-3.8-flash");
    expect(result.draftText.toLowerCase()).toContain("espresso");
    expect(result.validation.postValidateOk).toBe(true);
  });

  it("retries once when first output fails validation", async () => {
    let calls = 0;
    const result = await generateReviewDraft(
      {
        businessName: "Cafe Luna",
        ratings: [{ label: "Quality", rating: 3 }],
        comment: null,
      },
      {
        generate: async () => {
          calls += 1;
          if (calls === 1) {
            return {
              text: JSON.stringify({ draft_text: "Ok" }),
              usage: {},
            };
          }
          return {
            text: JSON.stringify({
              draft_text:
                "My visit was average overall. Quality felt okay but nothing stood out enough for a stronger review.",
            }),
            usage: { totalTokens: 80 },
          };
        },
      },
    );

    expect(calls).toBe(2);
    expect(result.validation.retries).toBe(1);
  });
});

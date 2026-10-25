import { describe, expect, it } from "vitest";
import {
  DraftModelOutputSchema,
  faithfulnessHeuristic,
  postValidateDraft,
  wordCount,
} from "./schemas";

describe("DraftModelOutputSchema", () => {
  it("accepts draft_text with optional warnings", () => {
    const parsed = DraftModelOutputSchema.parse({
      draft_text: "I had a solid visit and would return.",
      warnings: ["sparse comment"],
    });
    expect(parsed.draft_text.length).toBeGreaterThan(0);
  });
});

describe("postValidateDraft", () => {
  it("rejects incentive phrasing and empty-ish drafts", () => {
    expect(postValidateDraft("Great").ok).toBe(false);
    expect(
      postValidateDraft(
        "I loved the food and would give a discount for a five star review anytime now really.",
      ).ok,
    ).toBe(false);
    expect(
      postValidateDraft(
        "I enjoyed my visit. The service felt attentive and the atmosphere was calm.",
      ).ok,
    ).toBe(true);
  });
});

describe("faithfulnessHeuristic", () => {
  it("passes when comment words appear in the draft", () => {
    expect(
      faithfulnessHeuristic(
        "The lasagna was amazing and the patio seating was perfect.",
        "I loved the lasagna and sat on the patio.",
      ).ok,
    ).toBe(true);
  });

  it("flags when a detailed comment is ignored", () => {
    expect(
      faithfulnessHeuristic(
        "The lasagna was amazing and the patio seating was perfect.",
        "Everything was fine I guess overall.",
      ).ok,
    ).toBe(false);
  });
});

describe("wordCount", () => {
  it("counts words", () => {
    expect(wordCount(" one  two three ")).toBe(3);
  });
});

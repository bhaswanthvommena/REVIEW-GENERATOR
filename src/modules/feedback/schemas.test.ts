import { describe, expect, it } from "vitest";
import {
  assertCompleteAttributeRatings,
  FeedbackSubmitSchema,
} from "./schemas";
import { isSessionExpired } from "./service";

const attrA = "11111111-1111-4111-8111-111111111111";
const attrB = "22222222-2222-4222-8222-222222222222";
const sessionId = "33333333-3333-4333-8333-333333333333";

describe("FeedbackSubmitSchema", () => {
  it("requires 1–5 ratings and allows optional comment", () => {
    const parsed = FeedbackSubmitSchema.parse({
      sessionId,
      comment: "  Great visit  ",
      ratings: [
        { attributeId: attrA, rating: 5 },
        { attributeId: attrB, rating: 4 },
      ],
    });
    expect(parsed.comment).toBe("Great visit");
  });

  it("rejects rating outside 1–5", () => {
    const result = FeedbackSubmitSchema.safeParse({
      sessionId,
      ratings: [{ attributeId: attrA, rating: 0 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("assertCompleteAttributeRatings", () => {
  it("requires every attribute exactly once", () => {
    expect(() =>
      assertCompleteAttributeRatings(
        [attrA, attrB],
        [{ attributeId: attrA, rating: 3 }],
      ),
    ).toThrow(/Every attribute/);

    expect(() =>
      assertCompleteAttributeRatings(
        [attrA],
        [
          { attributeId: attrA, rating: 3 },
          { attributeId: attrA, rating: 4 },
        ],
      ),
    ).toThrow(/Duplicate/);

    expect(() =>
      assertCompleteAttributeRatings(
        [attrA, attrB],
        [
          { attributeId: attrA, rating: 3 },
          { attributeId: attrB, rating: 4 },
        ],
      ),
    ).not.toThrow();
  });
});

describe("isSessionExpired", () => {
  it("detects expired timestamps and expired status", () => {
    expect(
      isSessionExpired({
        status: "started",
        expires_at: new Date(Date.now() - 1000).toISOString(),
      }),
    ).toBe(true);
    expect(
      isSessionExpired({
        status: "expired",
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).toBe(true);
    expect(
      isSessionExpired({
        status: "started",
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).toBe(false);
  });
});

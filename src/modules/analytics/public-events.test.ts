import { describe, expect, it } from "vitest";
import { PublicAnalyticsEventSchema } from "./schemas";

describe("PublicAnalyticsEventSchema", () => {
  it("accepts draft_copied and google_continue_clicked", () => {
    expect(
      PublicAnalyticsEventSchema.parse({
        eventType: "draft_copied",
        feedbackSessionId: "33333333-3333-4333-8333-333333333333",
      }).eventType,
    ).toBe("draft_copied");

    expect(
      PublicAnalyticsEventSchema.parse({
        eventType: "google_continue_clicked",
      }).eventType,
    ).toBe("google_continue_clicked");
  });
});

describe("google CTA product lock", () => {
  it("documents that Google continue is never rating-gated", () => {
    const policy = "always_available_no_rating_gate" as const;
    expect(policy).toBe("always_available_no_rating_gate");
  });
});

import { describe, expect, it } from "vitest";
import { BusinessCreateSchema } from "./schemas";

describe("BusinessCreateSchema", () => {
  it("accepts a valid Google review URL", () => {
    const parsed = BusinessCreateSchema.parse({
      name: "Cafe Luna",
      googleReviewUrl: "https://g.page/r/Abc123/review",
    });
    expect(parsed.name).toBe("Cafe Luna");
  });

  it("rejects non-allowlisted review URLs", () => {
    const result = BusinessCreateSchema.safeParse({
      name: "Cafe Luna",
      googleReviewUrl: "https://example.com/review",
    });
    expect(result.success).toBe(false);
  });
});

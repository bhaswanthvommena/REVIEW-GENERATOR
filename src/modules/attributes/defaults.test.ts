import { describe, expect, it } from "vitest";
import { DEFAULT_RATING_ATTRIBUTE_LABELS } from "./schemas";

describe("DEFAULT_RATING_ATTRIBUTE_LABELS", () => {
  it("seeds exactly five default labels", () => {
    expect(DEFAULT_RATING_ATTRIBUTE_LABELS).toHaveLength(5);
    expect([...DEFAULT_RATING_ATTRIBUTE_LABELS]).toEqual([
      "Overall experience",
      "Quality",
      "Service",
      "Value",
      "Atmosphere",
    ]);
  });
});

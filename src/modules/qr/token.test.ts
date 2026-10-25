import { describe, expect, it } from "vitest";
import {
  buildPublicFeedbackUrl,
  generatePublicToken,
  isValidPublicTokenShape,
} from "./token";

describe("QR public tokens", () => {
  it("generates high-entropy URL-safe tokens of sufficient length", () => {
    const token = generatePublicToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(isValidPublicTokenShape(token)).toBe(true);
    expect(generatePublicToken()).not.toBe(token);
  });

  it("builds /r/:token public URLs", () => {
    const url = buildPublicFeedbackUrl("abcdefghijklmnopqrstuvwxyz012345");
    expect(url).toMatch(/\/r\/abcdefghijklmnopqrstuvwxyz012345$/);
  });

  it("rejects short or invalid tokens", () => {
    expect(isValidPublicTokenShape("short")).toBe(false);
    expect(isValidPublicTokenShape("has spaces!!!!!!!!!!!!!!!!!!!!!")).toBe(
      false,
    );
  });
});

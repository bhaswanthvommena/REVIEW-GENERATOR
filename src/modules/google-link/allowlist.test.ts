import { describe, expect, it } from "vitest";
import { isAllowedGoogleReviewUrl } from "./allowlist";

describe("isAllowedGoogleReviewUrl", () => {
  it("accepts official https Google review hosts", () => {
    expect(
      isAllowedGoogleReviewUrl("https://g.page/r/AbCdEf123/review"),
    ).toBe(true);
    expect(
      isAllowedGoogleReviewUrl("https://maps.app.goo.gl/abcdef"),
    ).toBe(true);
    expect(
      isAllowedGoogleReviewUrl(
        "https://search.google.com/local/writereview?placeid=ChIJ",
      ),
    ).toBe(true);
    expect(
      isAllowedGoogleReviewUrl(
        "https://www.google.com/maps/place/?q=place_id:ChIJ",
      ),
    ).toBe(true);
  });

  it("rejects redirect paths on Google hosts", () => {
    expect(isAllowedGoogleReviewUrl("https://www.google.com/url?q=https://evil.example")).toBe(false);
    expect(isAllowedGoogleReviewUrl("https://google.com/amp/evil")).toBe(false);
  });

  it("rejects non-https and non-Google hosts", () => {
    expect(isAllowedGoogleReviewUrl("http://g.page/r/x/review")).toBe(false);
    expect(isAllowedGoogleReviewUrl("https://evil.example/review")).toBe(
      false,
    );
    expect(isAllowedGoogleReviewUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedGoogleReviewUrl("not-a-url")).toBe(false);
  });
});

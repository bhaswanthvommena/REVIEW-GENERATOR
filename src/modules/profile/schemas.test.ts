import { describe, expect, it } from "vitest";
import { dateOfBirthSchema, fullNameSchema, phoneSchema } from "./schemas";

describe("profile fields", () => {
  it("requires a name", () => {
    expect(fullNameSchema.safeParse("  ").success).toBe(false);
    expect(fullNameSchema.parse("Ada Lovelace")).toBe("Ada Lovelace");
  });

  it("accepts a phone number with 8 to 15 digits", () => {
    expect(phoneSchema.safeParse("+1 (555) 123-4567").success).toBe(true);
    expect(phoneSchema.safeParse("123").success).toBe(false);
  });

  it("allows a blank date of birth and rejects the future", () => {
    expect(dateOfBirthSchema.safeParse("").success).toBe(true);
    expect(dateOfBirthSchema.safeParse("1990-04-02").success).toBe(true);
    expect(dateOfBirthSchema.safeParse("2999-01-01").success).toBe(false);
  });
});

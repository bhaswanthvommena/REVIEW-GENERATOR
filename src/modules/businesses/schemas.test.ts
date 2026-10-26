import { describe, expect, it } from "vitest";
import { BusinessCreateSchema, BusinessSetupSchema } from "./schemas";

const profile = {
  name: "Hari Car Decors",
  category: "Auto accessories",
  location: "Nellore",
  googleReviewUrl: "https://g.page/r/Abc123/review",
};

describe("BusinessCreateSchema", () => {
  it("accepts a valid profile", () => {
    const parsed = BusinessCreateSchema.parse(profile);
    expect(parsed.name).toBe("Hari Car Decors");
    expect(parsed.location).toBe("Nellore");
  });

  it("rejects non-allowlisted review URLs", () => {
    const result = BusinessCreateSchema.safeParse({
      ...profile,
      googleReviewUrl: "https://example.com/review",
    });
    expect(result.success).toBe(false);
  });

  it.each(["name", "category", "location"] as const)("requires %s", (key) => {
    expect(BusinessCreateSchema.safeParse({ ...profile, [key]: "  " }).success).toBe(false);
    const { [key]: _omitted, ...rest } = profile;
    void _omitted;
    expect(BusinessCreateSchema.safeParse(rest).success).toBe(false);
  });
});

describe("BusinessSetupSchema", () => {
  const base = {
    ...profile,
    fields: [
      { id: null, label: "Car make and model", isRequired: true, isActive: true },
      { id: null, label: "Comment", isRequired: false, isActive: true },
    ],
    attributes: [{ id: null, label: "Quality", isActive: true }],
  };

  it("accepts a full setup", () => {
    expect(BusinessSetupSchema.safeParse(base).success).toBe(true);
  });

  it("rejects duplicate names, ignoring case", () => {
    const result = BusinessSetupSchema.safeParse({
      ...base,
      fields: [
        { id: null, label: "Comment", isRequired: false, isActive: true },
        { id: null, label: "comment", isRequired: false, isActive: true },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("needs at least one shown rating question", () => {
    const result = BusinessSetupSchema.safeParse({
      ...base,
      attributes: [{ id: null, label: "Quality", isActive: false }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed id", () => {
    const result = BusinessSetupSchema.safeParse({
      ...base,
      fields: [{ id: "nope", label: "Comment", isRequired: false, isActive: true }],
    });
    expect(result.success).toBe(false);
  });
});

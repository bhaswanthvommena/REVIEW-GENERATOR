import { describe, expect, it } from "vitest";
import { FieldCreateSchema, FieldUpdateSchema } from "./schemas";

describe("FieldCreateSchema", () => {
  it("accepts a label alone and leaves the rest optional", () => {
    const parsed = FieldCreateSchema.parse({ label: "Car make and model" });
    expect(parsed.label).toBe("Car make and model");
    expect(parsed.inputType).toBeUndefined();
    expect(parsed.isRequired).toBeUndefined();
  });

  it("trims, collapses whitespace and strips control characters in labels", () => {
    const parsed = FieldCreateSchema.parse({
      label: "  Accessories \u0000\tinstalled  ",
    });
    expect(parsed.label).toBe("Accessories installed");
  });

  it("rejects empty and over-long labels", () => {
    expect(() => FieldCreateSchema.parse({ label: "   " })).toThrow();
    expect(() => FieldCreateSchema.parse({ label: "x".repeat(81) })).toThrow();
  });

  it("rejects unknown input types", () => {
    expect(() =>
      FieldCreateSchema.parse({ label: "Notes", inputType: "dropdown" }),
    ).toThrow();
  });
});

describe("FieldUpdateSchema", () => {
  it("accepts toggling required alone", () => {
    expect(FieldUpdateSchema.parse({ isRequired: true })).toEqual({
      isRequired: true,
    });
  });

  it("rejects an empty patch", () => {
    expect(() => FieldUpdateSchema.parse({})).toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { assertFieldAnswers, FeedbackSubmitSchema } from "./schemas";

const make = {
  id: "11111111-1111-4111-8111-111111111111",
  label: "Car make and model",
  isRequired: true,
  maxLength: 200,
};
const extras = {
  id: "22222222-2222-4222-8222-222222222222",
  label: "Comments",
  isRequired: false,
  maxLength: 1000,
};

describe("assertFieldAnswers", () => {
  it("returns cleaned, non-empty answers with labels in field order", () => {
    const result = assertFieldAnswers(
      [make, extras],
      [
        { fieldId: extras.id, value: "  Quick fitting \u0000 " },
        { fieldId: make.id, value: " Honda City 2021 " },
      ],
    );
    expect(result).toEqual([
      { fieldId: make.id, label: make.label, value: "Honda City 2021" },
      { fieldId: extras.id, label: extras.label, value: "Quick fitting" },
    ]);
  });

  it("drops blank answers to optional fields", () => {
    const result = assertFieldAnswers(
      [make, extras],
      [
        { fieldId: make.id, value: "Swift" },
        { fieldId: extras.id, value: "   " },
      ],
    );
    expect(result).toHaveLength(1);
  });

  it("rejects a missing or blank required field", () => {
    expect(() => assertFieldAnswers([make], [])).toThrow(/required/);
    expect(() =>
      assertFieldAnswers([make], [{ fieldId: make.id, value: "  " }]),
    ).toThrow(/required/);
  });

  it("rejects unknown fields, duplicates and over-long values", () => {
    const unknown = "33333333-3333-4333-8333-333333333333";
    expect(() =>
      assertFieldAnswers([make], [{ fieldId: unknown, value: "x" }]),
    ).toThrow(/Unexpected/);
    expect(() =>
      assertFieldAnswers(
        [extras],
        [
          { fieldId: extras.id, value: "a" },
          { fieldId: extras.id, value: "b" },
        ],
      ),
    ).toThrow(/Duplicate/);
    expect(() =>
      assertFieldAnswers([make], [{ fieldId: make.id, value: "x".repeat(201) }]),
    ).toThrow(/too long/);
  });

  it("accepts no answers when no fields exist", () => {
    expect(assertFieldAnswers([], [])).toEqual([]);
  });
});

describe("FeedbackSubmitSchema answers", () => {
  const base = {
    sessionId: "44444444-4444-4444-8444-444444444444",
    ratings: [{ attributeId: "55555555-5555-4555-8555-555555555555", rating: 4 }],
  };

  it("defaults answers to an empty list", () => {
    expect(FeedbackSubmitSchema.parse(base).answers).toEqual([]);
  });

  it("rejects an answer with a non-uuid field id", () => {
    expect(() =>
      FeedbackSubmitSchema.parse({
        ...base,
        answers: [{ fieldId: "nope", value: "x" }],
      }),
    ).toThrow();
  });
});

import { z } from "zod";

const ratingValue = z.number().int().min(1).max(5);

export const FeedbackSubmitSchema = z.object({
  sessionId: z.string().uuid(),
  comment: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((value) => {
      if (value == null || value === "") return null;
      // Strip control chars except newline/tab
      return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
    }),
  answers: z
    .array(
      z.object({
        fieldId: z.string().uuid(),
        value: z.string().max(2000),
      }),
    )
    .max(50)
    .optional()
    .default([]),
  ratings: z
    .array(
      z.object({
        attributeId: z.string().uuid(),
        rating: ratingValue,
      }),
    )
    .min(1),
});

export type FeedbackSubmitInput = z.infer<typeof FeedbackSubmitSchema>;

export type AnswerFieldRule = {
  id: string;
  label: string;
  isRequired: boolean;
  maxLength: number;
};

export type CleanFieldAnswer = {
  fieldId: string;
  label: string;
  value: string;
};

function cleanAnswerText(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

/**
 * Check customer answers against the business's active fields. Blank answers
 * to optional fields are dropped. Returns only non-empty, cleaned answers.
 */
export function assertFieldAnswers(
  fields: AnswerFieldRule[],
  answers: Array<{ fieldId: string; value: string }>,
): CleanFieldAnswer[] {
  const byId = new Map(fields.map((field) => [field.id, field]));
  const values = new Map<string, string>();

  for (const answer of answers) {
    const field = byId.get(answer.fieldId);
    if (!field) {
      throw new Error("Unexpected field in answers payload");
    }
    if (values.has(answer.fieldId)) {
      throw new Error("Duplicate answer for a field");
    }
    const value = cleanAnswerText(answer.value);
    if (value.length > field.maxLength) {
      throw new Error(`"${field.label}" is too long`);
    }
    values.set(answer.fieldId, value);
  }

  const clean: CleanFieldAnswer[] = [];
  for (const field of fields) {
    const value = values.get(field.id) ?? "";
    if (value === "") {
      if (field.isRequired) {
        throw new Error(`"${field.label}" is required`);
      }
      continue;
    }
    clean.push({ fieldId: field.id, label: field.label, value });
  }
  return clean;
}

/** Ensure every required attribute id is rated exactly once; none may be missing. */
export function assertCompleteAttributeRatings(
  requiredAttributeIds: string[],
  ratings: Array<{ attributeId: string; rating: number }>,
): void {
  const seen = new Map<string, number>();
  for (const row of ratings) {
    if (seen.has(row.attributeId)) {
      throw new Error("Duplicate rating for an attribute");
    }
    seen.set(row.attributeId, row.rating);
  }

  for (const id of requiredAttributeIds) {
    if (!seen.has(id)) {
      throw new Error("Every attribute must be rated from 1 to 5");
    }
  }

  for (const id of seen.keys()) {
    if (!requiredAttributeIds.includes(id)) {
      throw new Error("Unexpected attribute in ratings payload");
    }
  }
}

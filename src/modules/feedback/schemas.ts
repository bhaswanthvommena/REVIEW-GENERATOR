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

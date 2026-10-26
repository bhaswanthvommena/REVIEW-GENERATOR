import { z } from "zod";
import { isAllowedGoogleReviewUrl } from "@/modules/google-link";

/** One line of text with control characters removed. */
function requiredText(max: number, message: string) {
  return z
    .string()
    .transform((value) =>
      value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim(),
    )
    .pipe(z.string().min(1, message).max(max));
}

const googleReviewUrl = z
  .string()
  .trim()
  .url()
  .refine(isAllowedGoogleReviewUrl, {
    message: "URL must be an https Google review / Maps link",
  });

export const BusinessCreateSchema = z.object({
  name: requiredText(120, "Business name is required"),
  category: requiredText(80, "Category is required"),
  location: requiredText(120, "Location is required"),
  description: z.string().trim().max(2000).optional().nullable(),
  googleReviewUrl,
});

export const BusinessUpdateSchema = BusinessCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field is required" },
);

const itemLabel = requiredText(80, "Name is required");

/** Everything the owner edits on the setup page, saved together. */
export const BusinessSetupSchema = BusinessCreateSchema.extend({
  fields: z
    .array(
      z.object({
        id: z.uuid().nullable(),
        label: itemLabel,
        isRequired: z.boolean(),
        isActive: z.boolean(),
      }),
    )
    .max(20),
  attributes: z
    .array(
      z.object({
        id: z.uuid().nullable(),
        label: itemLabel,
        isActive: z.boolean(),
      }),
    )
    .max(20),
}).superRefine((value, ctx) => {
  const check = (labels: string[], path: "fields" | "attributes") => {
    const seen = new Set<string>();
    labels.forEach((label, index) => {
      const key = label.toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: [path, index, "label"],
          message: "Names must be different from each other",
        });
      }
      seen.add(key);
    });
  };
  check(value.fields.map((item) => item.label), "fields");
  check(value.attributes.map((item) => item.label), "attributes");
  if (!value.attributes.some((item) => item.isActive)) {
    ctx.addIssue({
      code: "custom",
      path: ["attributes"],
      message: "Keep at least one rating question shown",
    });
  }
});

export type BusinessCreateInput = z.infer<typeof BusinessCreateSchema>;
export type BusinessUpdateInput = z.infer<typeof BusinessUpdateSchema>;
export type BusinessSetupInput = z.infer<typeof BusinessSetupSchema>;

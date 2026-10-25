import { z } from "zod";
import { isAllowedGoogleReviewUrl } from "@/modules/google-link";

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case")
  .optional()
  .nullable();

export const BusinessCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema,
  category: z.string().trim().min(1).max(80).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  googleReviewUrl: z
    .string()
    .trim()
    .url()
    .refine(isAllowedGoogleReviewUrl, {
      message: "URL must be an https Google review / Maps link",
    }),
});

export const BusinessUpdateSchema = BusinessCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field is required" },
);

export type BusinessCreateInput = z.infer<typeof BusinessCreateSchema>;
export type BusinessUpdateInput = z.infer<typeof BusinessUpdateSchema>;

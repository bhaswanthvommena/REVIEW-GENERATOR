import { z } from "zod";

export const DEFAULT_RATING_ATTRIBUTE_LABELS = [
  "Overall experience",
  "Quality",
  "Service",
  "Value",
  "Atmosphere",
] as const;

export const AttributeCreateSchema = z.object({
  label: z.string().trim().min(1).max(80),
  displayOrder: z.number().int().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
});

export const AttributeUpdateSchema = z
  .object({
    label: z.string().trim().min(1).max(80).optional(),
    displayOrder: z.number().int().min(0).max(1000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export type AttributeCreateInput = z.infer<typeof AttributeCreateSchema>;
export type AttributeUpdateInput = z.infer<typeof AttributeUpdateSchema>;

import { z } from "zod";

const label = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .transform((value) =>
    value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim(),
  )
  .pipe(z.string().min(1));

const inputType = z.enum(["short", "long"]);

export const FieldCreateSchema = z.object({
  label,
  inputType: inputType.optional(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).max(1000).optional(),
});

export const FieldUpdateSchema = z
  .object({
    label: label.optional(),
    inputType: inputType.optional(),
    isRequired: z.boolean().optional(),
    isActive: z.boolean().optional(),
    displayOrder: z.number().int().min(0).max(1000).optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "At least one field is required",
  });

export type FieldCreateInput = z.infer<typeof FieldCreateSchema>;
export type FieldUpdateInput = z.infer<typeof FieldUpdateSchema>;

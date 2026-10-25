import { z } from "zod";

export const QrCreateSchema = z.object({
  label: z.string().trim().min(1).max(120).optional().nullable(),
});

export const QrFormatSchema = z.enum(["png", "svg"]);

export type QrCreateInput = z.infer<typeof QrCreateSchema>;

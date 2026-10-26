import { z } from "zod";

export const fullNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(80, "Name must be 80 characters or fewer");

/** Digits only, after dropping spaces, dashes, and parentheses. */
export function phoneDigits(value: string): string {
  return value.replace(/[^\d]/g, "");
}

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .max(20)
  .refine((value) => {
    const digits = phoneDigits(value);
    return digits.length >= 8 && digits.length <= 15 && /^\+?[\d\s().-]+$/.test(value);
  }, "Enter a valid phone number");

export const dateOfBirthSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a valid date")
  .refine((value) => {
    if (!value) return true;
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date <= today;
  }, "Date of birth cannot be in the future");

export type ProfileFields = {
  fullName: string;
  phone: string;
  dateOfBirth: string;
};

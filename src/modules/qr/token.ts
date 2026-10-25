import { randomBytes } from "node:crypto";
import { getAppUrl } from "@/lib/url";

/** High-entropy URL-safe token (≥32 chars). Treat like a password. */
export function generatePublicToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function buildPublicFeedbackUrl(token: string): string {
  return `${getAppUrl()}/r/${encodeURIComponent(token)}`;
}

export function isValidPublicTokenShape(token: string): boolean {
  return /^[A-Za-z0-9_-]{32,128}$/.test(token);
}

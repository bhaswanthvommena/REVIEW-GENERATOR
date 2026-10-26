import { getPublicEnv } from "@/lib/env";

/** Same-origin path only. Rejects protocol-relative and external redirects. */
export function safeInternalPath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  return value;
}

/** App origin for public QR links. Falls back for local/dev without env. */
export function getAppUrl(): string {
  const fromEnv = getPublicEnv().NEXT_PUBLIC_APP_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

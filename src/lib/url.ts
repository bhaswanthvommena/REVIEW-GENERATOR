import { getPublicEnv } from "@/lib/env";

/** Same-origin path only. Rejects protocol-relative, backslash, encoded, and external redirects. */
export function safeInternalPath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!value) return fallback;

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }

  // Reject protocol-relative, backslashes (including decoded %5C), control chars
  if (
    !decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    decoded.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(decoded)
  ) {
    return fallback;
  }

  // Reject dot-segments and dotfile style paths (e.g., /.well-known, /./, /../)
  if (/^\/\./.test(decoded) || /\/\.\.?(\/|$)/.test(decoded)) {
    return fallback;
  }

  // Check the raw unencoded input with the same restrictions
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /^\/\./.test(value) ||
    /\/\.\.?(\/|$)/.test(value)
  ) {
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

import { getPublicEnv } from "@/lib/env";

/** App origin for public QR links. Falls back for local/dev without env. */
export function getAppUrl(): string {
  const fromEnv = getPublicEnv().NEXT_PUBLIC_APP_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

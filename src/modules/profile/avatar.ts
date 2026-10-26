import { requireSupabasePublicEnv } from "@/lib/env";

export function publicAvatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const { url } = requireSupabasePublicEnv();
  return `${url}/storage/v1/object/public/avatars/${path}`;
}

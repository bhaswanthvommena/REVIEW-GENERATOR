import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPublicEnv } from "@/lib/env";

export async function POST(request: Request) {
  // CSRF guard: reject cross-origin form posts.
  const env = getPublicEnv();
  const appUrl = env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const origin = request.headers.get("origin");
  if (appUrl && origin && origin !== appUrl) {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
}

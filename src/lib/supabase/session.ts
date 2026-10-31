import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // If the refresh token is missing, expired, or invalid, clear all Supabase auth cookies
      // to prevent continuous failed refresh cycles on every subsequent request.
      const isRefreshTokenError =
        error.message?.includes("Refresh Token Not Found") ||
        error.message?.includes("refresh_token_not_found") ||
        (error as unknown as { code?: string }).code === "refresh_token_not_found" ||
        (error as unknown as { status?: number }).status === 400;

      if (isRefreshTokenError) {
        for (const cookie of request.cookies.getAll()) {
          if (cookie.name.startsWith("sb-")) {
            supabaseResponse.cookies.delete(cookie.name);
          }
        }
      }
    } else {
      user = data.user;
    }
  } catch {
    user = null;
  }

  const path = request.nextUrl.pathname;
  const isDashboard = path.startsWith("/dashboard");
  const isLogin = path === "/login";

  if (isDashboard && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", path);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Propagate cookie changes (e.g. cleared invalid session cookies) to redirect
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  if (isLogin && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    const redirectResponse = NextResponse.redirect(redirectUrl);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  return supabaseResponse;
}

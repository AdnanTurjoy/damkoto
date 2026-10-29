import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const CLIENT_COOKIE = "dk_cid";

/**
 * 1. Ensures every visitor has an anonymous, httpOnly client id so guest
 *    contributions can be owned (edit/delete) and rate-limited without
 *    accounts.
 * 2. Refreshes the Supabase auth session cookie when Supabase is configured.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!request.cookies.get(CLIENT_COOKIE)) {
    const id = crypto.randomUUID();
    request.cookies.set(CLIENT_COOKIE, id);
    response = NextResponse.next({ request });
    response.cookies.set(CLIENT_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365 * 2,
    });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key && hasSupabaseCookie(request)) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    });
    await supabase.auth.getUser();
  }

  return response;
}

function hasSupabaseCookie(request: NextRequest) {
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};

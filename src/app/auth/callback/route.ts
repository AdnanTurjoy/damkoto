import { NextResponse, type NextRequest } from "next/server";
import { features } from "@/config/env";
import { createSupabaseServerClient } from "@/lib/auth/session";

/** Completes Supabase magic-link sign-in by exchanging the one-time code. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/admin";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/admin";
  if (features.supabaseAuth && code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(new URL("/login?error=1", origin));
}

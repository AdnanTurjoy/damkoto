"use server";

import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env, features } from "@/config/env";
import { siteConfig } from "@/config/site";
import { profiles } from "@/db/schema";
import { createSupabaseServerClient, DEV_SESSION_COOKIE, signDevSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getIpHash } from "@/lib/identity";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/core";

export interface AuthState {
  error?: string;
  message?: string;
}

const credentialsSchema = z.object({ email: z.email(), password: z.string().min(6).max(200) });

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
}

async function allowLogin(): Promise<boolean> {
  return consumeRateLimit(await getDb(), `login:ip:${await getIpHash()}`, RATE_LIMITS.loginPerIp);
}

export async function signInAction(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!features.supabaseAuth) return { error: "auth.notConfigured" };
  if (!(await allowLogin())) return { error: "errors.rateLimited" };
  const parsed = credentialsSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "auth.invalid" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "auth.invalid" };
  redirect(safeNext(formData.get("next")));
}

export async function magicLinkAction(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!features.supabaseAuth) return { error: "auth.notConfigured" };
  if (!(await allowLogin())) return { error: "errors.rateLimited" };
  const email = z.email().safeParse(formData.get("email"));
  if (!email.success) return { error: "auth.invalid" };
  const origin = (await headers()).get("origin") ?? siteConfig.url;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    // Staff accounts are created by the project owner in Supabase; no public sign-up.
    options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext(formData.get("next")))}` },
  });
  if (error) return { error: "auth.invalid" };
  return { message: "auth.magicSent" };
}

/** Local development only: sign in as a seeded staff profile without Supabase. */
export async function devSignInAction(formData: FormData): Promise<void> {
  if (!env.devAuthEnabled) return;
  const role = formData.get("role") === "admin" ? "admin" : "moderator";
  const id = role === "admin" ? "00000000-0000-4000-8000-0000000000a1" : "00000000-0000-4000-8000-0000000000b1";
  const db = await getDb();
  await db
    .insert(profiles)
    .values({ id, role, displayName: role === "admin" ? "Dev Admin" : "Dev Moderator" })
    .onConflictDoUpdate({ target: profiles.id, set: { role } });
  const [profile] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, id));
  (await cookies()).set(DEV_SESSION_COOKIE, signDevSession(profile.id), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  redirect(safeNext(formData.get("next")));
}

export async function signOutAction(): Promise<void> {
  const store = await cookies();
  store.delete(DEV_SESSION_COOKIE);
  if (features.supabaseAuth) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function setLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
}

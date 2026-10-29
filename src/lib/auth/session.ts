import "server-only";
import { timingSafeEqual } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { env, features } from "@/config/env";
import { profiles } from "@/db/schema";
import { isAdmin, isStaff, type Role, type Viewer } from "@/features/auth/permissions";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { hmac } from "@/lib/identity";

export const DEV_SESSION_COOKIE = "dk_dev_session";

export async function createSupabaseServerClient() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component; the proxy refreshes the session instead.
        }
      },
    },
  });
}

export function signDevSession(profileId: string): string {
  return `${profileId}.${hmac(profileId, "dev-session")}`;
}

function verifyDevSession(token: string | undefined): string | null {
  if (!token) return null;
  const [id, signature] = token.split(".");
  if (!id || !signature) return null;
  const expected = Buffer.from(hmac(id, "dev-session"));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? id : null;
}

async function resolveUserId(): Promise<string | null> {
  if (env.devAuthEnabled) {
    const id = verifyDevSession((await cookies()).get(DEV_SESSION_COOKIE)?.value);
    if (id) return id;
  }
  if (!features.supabaseAuth) return null;
  const store = await cookies();
  if (!store.getAll().some((c) => c.name.startsWith("sb-"))) return null;
  const supabase = await createSupabaseServerClient();
  // getUser() validates the token with Supabase; never trust the cookie alone.
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** The signed-in user (staff or registered contributor), or null for guests. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const userId = await resolveUserId();
  if (!userId) return null;
  const db = await getDb();
  await db.insert(profiles).values({ id: userId }).onConflictDoNothing();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId));
  return profile ? { id: profile.id, role: profile.role as Role, displayName: profile.displayName } : null;
});

export async function requireStaff(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new AppError("errors.unauthorized", 401);
  if (!isStaff(viewer)) throw new AppError("errors.forbidden", 403);
  return viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireStaff();
  if (!isAdmin(viewer)) throw new AppError("errors.forbidden", 403);
  return viewer;
}

/** For admin pages: layouts and pages render in parallel, so each page re-checks. */
export async function staffPageGuard(options: { admin?: boolean } = {}): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer || !isStaff(viewer) || (options.admin && !isAdmin(viewer))) notFound();
  return viewer;
}

import { eq } from "drizzle-orm";
import { categories, profiles } from "@/db/schema";
import { createPgliteDatabase, type Database } from "@/lib/db/client";
import type { Viewer } from "@/features/auth/permissions";
import type { SubmitContext } from "@/features/prices/service";

/** Fresh in-memory Postgres (PGlite) with real migrations and reference seed. */
export async function createTestDb(): Promise<Database> {
  return createPgliteDatabase("memory://");
}

export async function categoryId(db: Database, slug: string) {
  const [row] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug));
  return row.id;
}

export async function createStaff(db: Database, role: "moderator" | "admin", id = role === "admin" ? "00000000-0000-4000-8000-00000000000a" : "00000000-0000-4000-8000-00000000000b"): Promise<Viewer> {
  await db.insert(profiles).values({ id, role, displayName: role }).onConflictDoNothing();
  return { id, role, displayName: role };
}

export function guest(clientHash: string, extra: Partial<SubmitContext> = {}): SubmitContext {
  return { clientHash, viewer: null, moderationMode: "post", ...extra };
}

// District ids follow the seed scheme: 1000 + source key; upazilas 10000 + key.
export const DHAKA = { divisionId: 6, districtId: 1047 };
export const SAVAR = 10365;
export const DEBIDWAR = 10001;
export const CUMILLA = { divisionId: 1, districtId: 1001 };

export function reportInput(overrides: Record<string, unknown> = {}, location: Record<string, unknown> = DHAKA) {
  return { productName: "আলু", price: "40", quantity: "1", unit: "kg", location: { ...location }, ...overrides };
}

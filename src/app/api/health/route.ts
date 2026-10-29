import { sql } from "drizzle-orm";
import { locations } from "@/db/schema";
import { getDb } from "@/lib/db";
import { fail, ok } from "@/lib/http";

/** GET /api/health — liveness plus a trivial database round trip. */
export async function GET() {
  try {
    const db = await getDb();
    await db.select({ one: sql<number>`1` }).from(locations).limit(1);
    return ok({ database: "up" });
  } catch {
    return fail("errors.serviceTitle", 503);
  }
}

import "server-only";
import { env } from "@/config/env";
import { createDatabase, type Database } from "./client";

const globalForDb = globalThis as unknown as { __damkotoDb?: Promise<Database> };

/**
 * Returns the shared database handle. Uses Postgres (Supabase) when
 * DATABASE_URL is set; otherwise an embedded PGlite database for local
 * development, migrated and seeded with reference data on first use.
 */
export function getDb(): Promise<Database> {
  if (!globalForDb.__damkotoDb) {
    globalForDb.__damkotoDb = createDatabase({
      databaseUrl: env.databaseUrl,
      pgliteDir: env.pgliteDir,
      allowPglite: !env.isProduction || process.env.ALLOW_PGLITE_IN_PRODUCTION === "true",
    }).catch((error) => {
      globalForDb.__damkotoDb = undefined;
      throw error;
    });
  }
  return globalForDb.__damkotoDb;
}

export type { Database } from "./client";

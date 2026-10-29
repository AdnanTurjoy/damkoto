import path from "node:path";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";

/**
 * Both drivers expose the same query builder; we type against postgres-js.
 * Raw `db.execute` results differ between drivers, so the app sticks to the
 * query builder (with `sql` fragments) everywhere.
 */
export type Database = PostgresJsDatabase<typeof schema>;

export class DatabaseUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DatabaseUnavailableError";
  }
}

const MIGRATIONS_FOLDER = path.join(process.cwd(), "supabase/migrations");

interface CreateOptions {
  databaseUrl?: string;
  pgliteDir?: string;
  allowPglite?: boolean;
  /** Run migrations + reference seed on PGlite start (default true). */
  bootstrap?: boolean;
}

export async function createDatabase(options: CreateOptions): Promise<Database> {
  if (options.databaseUrl) {
    const { default: postgres } = await import("postgres");
    const client = postgres(options.databaseUrl, {
      // Supabase's transaction pooler (port 6543) does not support prepared statements.
      prepare: false,
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      idle_timeout: 20,
      connect_timeout: 10,
    });
    return drizzlePostgres(client, { schema });
  }

  if (!options.allowPglite) {
    throw new DatabaseUnavailableError("DATABASE_URL is not configured.");
  }
  return createPgliteDatabase(options.pgliteDir ?? "memory://", options.bootstrap ?? true);
}

export async function createPgliteDatabase(dir: string, bootstrap = true): Promise<Database> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { pg_trgm } = await import("@electric-sql/pglite/contrib/pg_trgm");
  const { drizzle } = await import("drizzle-orm/pglite");
  const client = new PGlite({ dataDir: dir === "memory://" ? undefined : path.resolve(dir), extensions: { pg_trgm } });
  const db = drizzle(client, { schema });
  if (bootstrap) {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    const { seedReferenceData } = await import("@/db/seed");
    await seedReferenceData(db as unknown as Database);
  }
  return db as unknown as Database;
}

/** True for errors that mean the database is unreachable or paused. */
export function isDatabaseUnavailable(error: unknown): boolean {
  if (error instanceof DatabaseUnavailableError) return true;
  const code = (error as { code?: string } | null)?.code;
  const message = String((error as { message?: string } | null)?.message ?? "");
  return (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    code === "CONNECT_TIMEOUT" ||
    code === "57P01" ||
    code === "53300" ||
    /connect|terminat|timeout|too many clients|Tenant or user not found/i.test(message)
  );
}

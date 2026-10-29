/**
 * Database CLI.
 *   tsx scripts/db.ts migrate     apply supabase/migrations
 *   tsx scripts/db.ts seed        reference data (categories, products, locations) — safe in production
 *   tsx scripts/db.ts seed:demo   development-only sample reports (is_demo = true)
 *
 * Loads .env / .env.local like Next.js. Uses MIGRATION_DATABASE_URL (Supabase
 * session pooler, port 5432) when set, else DATABASE_URL, else local PGlite.
 */
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createDatabase, createPgliteDatabase } from "../src/lib/db/client";
import { seedDemoData, seedReferenceData } from "../src/db/seed";

async function main() {
  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
  const command = process.argv[2];
  const url = (process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL)?.trim();
  const migrationsFolder = path.join(process.cwd(), "supabase/migrations");

  if (url) {
    const db = await createDatabase({ databaseUrl: url });
    if (command === "migrate") {
      const { migrate } = await import("drizzle-orm/postgres-js/migrator");
      await migrate(db, { migrationsFolder });
    } else if (command === "seed") {
      await seedReferenceData(db);
    } else if (command === "seed:demo") {
      if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEMO_SEED !== "true") {
        throw new Error("Refusing to seed demo data into DATABASE_URL. Set ALLOW_DEMO_SEED=true for a non-production database.");
      }
      console.log(`Inserted ${await seedDemoData(db)} demo reports`);
    } else {
      throw new Error(`Unknown command: ${command}`);
    }
    await (db as unknown as { $client: { end: () => Promise<void> } }).$client.end();
  } else {
    // PGlite migrates and seeds reference data automatically on open.
    const db = await createPgliteDatabase(process.env.PGLITE_DIR ?? ".data/pglite");
    if (command === "seed:demo") console.log(`Inserted ${await seedDemoData(db)} demo reports`);
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
  }
  console.log(`✓ ${command} complete`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

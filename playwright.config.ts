import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

/**
 * E2E runs against an isolated dev server with a throwaway PGlite database
 * seeded with labelled demo data. No external services are contacted except
 * map tiles, which tests do not depend on.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, locale: "bn-BD", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1360, height: 900 } } }],
  webServer: {
    command: `rm -rf .data/e2e && mkdir -p .data && tsx scripts/db.ts seed:demo && next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      PGLITE_DIR: ".data/e2e",
      NEXT_DIST_DIR: ".next-e2e",
      DEV_AUTH_ENABLED: "true",
      SHOW_DEMO_DATA: "true",
      DATABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_URL: "",
      CLOUDINARY_CLOUD_NAME: "",
    },
  },
});

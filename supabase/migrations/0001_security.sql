-- Security model
-- ------------------------------------------------------------------
-- All writes go through the Next.js server, which connects with the
-- database owner role (DATABASE_URL) and enforces validation, rate limits
-- and authorization in code. RLS is enabled on every table so that the
-- Supabase Data API (anon / authenticated roles) can never write, and can
-- only read published, non-sensitive rows.
--
-- The role-specific part only runs where Supabase's `anon` role exists, so
-- the same migration also applies cleanly to plain Postgres / PGlite.

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "locations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "price_reports" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "report_reactions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "content_reports" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "moderation_actions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "geocode_cache" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

    -- Reference data
    GRANT SELECT ON locations, categories, products TO anon, authenticated;
    CREATE POLICY "public read locations" ON locations FOR SELECT TO anon, authenticated USING (true);
    CREATE POLICY "public read active categories" ON categories FOR SELECT TO anon, authenticated USING (is_active);
    CREATE POLICY "public read products" ON products FOR SELECT TO anon, authenticated USING (true);

    -- Published reports, without the submitter hash or contributor id
    GRANT SELECT (id, product_name, product_key, product_id, category_id, brand, variant, price, currency,
      quantity, unit, package_description, base_unit, unit_price, condition, note, image_url, display_name,
      purchase_date, report_date, status, is_demo, division_id, district_id, upazila_id, locality,
      market_name, lat, lng, comment_count, created_at)
      ON price_reports TO anon, authenticated;
    CREATE POLICY "public read published reports" ON price_reports FOR SELECT TO anon, authenticated
      USING (status = 'published');

    -- Published comments, without the author hash or id
    GRANT SELECT (id, report_id, parent_id, display_name, body, sticker_id, district_id, upazila_id,
      locality, status, created_at)
      ON comments TO anon, authenticated;
    CREATE POLICY "public read published comments" ON comments FOR SELECT TO anon, authenticated
      USING (status = 'published' AND deleted_at IS NULL);

    -- A signed-in user may read their own profile (role checks happen server-side).
    GRANT SELECT ON profiles TO authenticated;
    CREATE POLICY "read own profile" ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
  END IF;
END
$$;

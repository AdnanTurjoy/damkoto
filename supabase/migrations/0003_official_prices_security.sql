ALTER TABLE "official_prices" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON official_prices FROM anon, authenticated;
    GRANT SELECT (id, category, source, item_bn, item_en, product_id, price_min, price_max, quantity, unit, unit_label,
      base_unit, unit_min, unit_max, area, effective_date, source_url, note, is_active, created_at, updated_at)
      ON official_prices TO anon, authenticated;
    CREATE POLICY "public read active official prices" ON official_prices FOR SELECT TO anon, authenticated USING (is_active);
  END IF;
END
$$;

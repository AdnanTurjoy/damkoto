import { eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { approximateCoordinate, dhakaToday, normalizeKey, shiftDate } from "@/lib/utils";
import { comparableUnitPrice, type UnitCode } from "@/features/prices/units";
import { categories, locations, priceReports, products } from "./schema";
import locationData from "./seed-data/bd-locations.json";
import { SEED_CATEGORIES, SEED_PRODUCTS } from "./seed-data/catalog";

/** Location id scheme keeps ids stable across environments. */
export const locationId = {
  division: (key: string | number) => Number(key),
  district: (key: string | number) => 1000 + Number(key),
  upazila: (key: string | number) => 10000 + Number(key),
};

/**
 * Inserts categories, the product catalog and Bangladesh administrative
 * areas. Idempotent: existing rows (matched by slug/id) are left untouched,
 * so admin edits survive re-seeding. Never inserts price reports.
 */
export async function seedReferenceData(db: Database): Promise<void> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(locations);
  if (count === 0) {
    await db.transaction(async (tx) => {
      await tx.insert(locations).values(
        locationData.divisions.map((d) => ({
          id: locationId.division(d.key),
          level: "division" as const,
          parentId: null,
          // Several divisions share a name with their district (e.g. Rajshahi).
          slug: `${d.slug}-division`,
          nameBn: d.nameBn,
          nameEn: d.nameEn,
          lat: d.lat,
          lng: d.lng,
        })),
      );
      await tx.insert(locations).values(
        locationData.districts.map((d) => ({
          id: locationId.district(d.key),
          level: "district" as const,
          parentId: locationId.division(d.divisionKey),
          slug: d.slug,
          nameBn: d.nameBn,
          nameEn: d.nameEn,
          lat: d.lat,
          lng: d.lng,
        })),
      );
      const upazilaRows = locationData.upazilas.map((u) => ({
        id: locationId.upazila(u.key),
        level: "upazila" as const,
        parentId: locationId.district(u.districtKey),
        slug: u.slug,
        nameBn: u.nameBn,
        nameEn: u.nameEn,
      }));
      for (let i = 0; i < upazilaRows.length; i += 200) {
        await tx.insert(locations).values(upazilaRows.slice(i, i + 200));
      }
    });
  }

  let order = 10;
  for (const category of SEED_CATEGORIES) {
    await db
      .insert(categories)
      .values({
        slug: category.slug,
        nameBn: category.nameBn,
        nameEn: category.nameEn,
        icon: category.icon,
        sortOrder: order,
        suggestedUnits: category.units ?? null,
      })
      .onConflictDoNothing({ target: categories.slug });
    order += 10;
    const [parent] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, category.slug));
    let childOrder = 10;
    for (const child of category.children ?? []) {
      await db
        .insert(categories)
        .values({
          slug: child.slug,
          nameBn: child.nameBn,
          nameEn: child.nameEn,
          icon: category.icon,
          parentId: parent.id,
          sortOrder: childOrder,
          suggestedUnits: child.units ?? category.units ?? null,
        })
        .onConflictDoNothing({ target: categories.slug });
      childOrder += 10;
    }
  }

  const categoryRows = await db.select({ id: categories.id, slug: categories.slug }).from(categories);
  const categoryBySlug = new Map(categoryRows.map((c) => [c.slug, c.id]));
  await db
    .insert(products)
    .values(
      SEED_PRODUCTS.map((p) => ({
        slug: p.slug,
        categoryId: categoryBySlug.get(p.category)!,
        nameBn: p.nameBn,
        nameEn: p.nameEn,
        aliases: (p.aliases ?? []).map(normalizeKey),
        defaultUnit: p.unit ?? null,
      })),
    )
    .onConflictDoNothing({ target: products.slug });
}

/**
 * Development-only sample reports, flagged `is_demo` and labelled in the UI.
 * Prices are illustrative; they are hidden from public queries unless
 * SHOW_DEMO_DATA=true. Never run this against production.
 */
export async function seedDemoData(db: Database): Promise<number> {
  const existing = await db.select({ count: sql<number>`count(*)::int` }).from(priceReports).where(eq(priceReports.isDemo, true));
  if (existing[0].count > 0) return 0;

  const productRows = await db.select().from(products);
  const productBySlug = new Map(productRows.map((p) => [p.slug, p]));
  const districts = locationData.districts;
  const upazilasByDistrict = new Map<string, typeof locationData.upazilas>();
  for (const u of locationData.upazilas) {
    upazilasByDistrict.set(u.districtKey, [...(upazilasByDistrict.get(u.districtKey) ?? []), u]);
  }

  // Small deterministic PRNG so demo data is reproducible.
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const samples: { slug: string; base: number; quantity: number; unit: UnitCode; variant?: string }[] = [
    { slug: "potato", base: 40, quantity: 1, unit: "kg" },
    { slug: "onion", base: 90, quantity: 1, unit: "kg" },
    { slug: "tomato", base: 80, quantity: 1, unit: "kg" },
    { slug: "green-chilli", base: 30, quantity: 250, unit: "g" },
    { slug: "brinjal", base: 70, quantity: 1, unit: "kg" },
    { slug: "rice-coarse", base: 55, quantity: 1, unit: "kg" },
    { slug: "lentil-masoor", base: 130, quantity: 1, unit: "kg" },
    { slug: "soybean-oil", base: 180, quantity: 1, unit: "l" },
    { slug: "egg-farm", base: 150, quantity: 1, unit: "dozen" },
    { slug: "chicken-broiler", base: 190, quantity: 1, unit: "kg" },
    { slug: "lpg-12kg-refill", base: 1450, quantity: 1, unit: "cylinder", variant: "12 kg" },
  ];

  const today = dhakaToday();
  const rows: (typeof priceReports.$inferInsert)[] = [];
  for (let i = 0; i < 120; i++) {
    const sample = samples[Math.floor(rand() * samples.length)];
    const product = productBySlug.get(sample.slug)!;
    const district = districts[Math.floor(rand() * districts.length)];
    const upazilas = upazilasByDistrict.get(district.key) ?? [];
    const upazila = upazilas.length ? upazilas[Math.floor(rand() * upazilas.length)] : null;
    const price = Math.round(sample.base * (0.8 + rand() * 0.45));
    const { baseUnit, unitPrice } = comparableUnitPrice(price, sample.quantity, sample.unit);
    const reportDate = shiftDate(today, -Math.floor(rand() * 60));
    rows.push({
      productName: product.nameBn,
      productKey: product.slug,
      productId: product.id,
      categoryId: product.categoryId,
      variant: sample.variant ?? null,
      variantKey: normalizeKey(sample.variant),
      price: price.toFixed(2),
      quantity: sample.quantity.toString(),
      unit: sample.unit,
      baseUnit,
      unitPrice: unitPrice.toString(),
      submitterHash: "demo-seed",
      purchaseDate: reportDate,
      reportDate,
      createdAt: new Date(`${reportDate}T10:00:00+06:00`),
      isDemo: true,
      divisionId: locationId.division(district.divisionKey),
      districtId: locationId.district(district.key),
      upazilaId: upazila ? locationId.upazila(upazila.key) : null,
      lat: approximateCoordinate(district.lat + (rand() - 0.5) * 0.12),
      lng: approximateCoordinate(district.lng + (rand() - 0.5) * 0.12),
      locationMethod: "map",
      marketName: rand() > 0.5 ? "নমুনা বাজার" : null,
      note: "নমুনা তথ্য — প্রকৃত বাজারদর নয়।",
    });
  }
  await db.insert(priceReports).values(rows);
  return rows.length;
}

import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { moderationActions, officialPrices, products, OFFICIAL_CATEGORIES } from "@/db/schema";
import type { Database } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { escapeLike } from "@/lib/utils";
import { isStaff, type Viewer } from "@/features/auth/permissions";
import { fieldErrors } from "@/schemas/price-report";
import { comparableUnitPrice } from "@/features/prices/units";
import { csvToInputs, officialPriceInputSchema, type OfficialPriceInput } from "./schema";

function assertStaff(viewer: Viewer | null): asserts viewer is Viewer {
  if (!viewer) throw new AppError("errors.unauthorized", 401);
  if (!isStaff(viewer)) throw new AppError("errors.forbidden", 403);
}

async function toRow(db: Database, input: OfficialPriceInput) {
  let productId: string | null = null;
  if (input.productSlug) {
    const [product] = await db.select({ id: products.id }).from(products).where(eq(products.slug, input.productSlug));
    if (!product) throw new AppError("official.unknownProduct", 422, { productSlug: "official.unknownProduct" });
    productId = product.id;
  }
  const min = comparableUnitPrice(input.priceMin, input.quantity, input.unit);
  const max = input.priceMax !== undefined ? comparableUnitPrice(input.priceMax, input.quantity, input.unit) : null;
  return {
    category: input.category,
    source: input.source,
    itemBn: input.itemBn,
    itemEn: input.itemEn,
    productId,
    priceMin: input.priceMin.toFixed(2),
    priceMax: input.priceMax !== undefined ? input.priceMax.toFixed(2) : null,
    quantity: input.quantity.toString(),
    unit: input.unit,
    unitLabel: input.unitLabel ?? null,
    baseUnit: min.baseUnit,
    unitMin: min.unitPrice.toString(),
    unitMax: max ? max.unitPrice.toString() : null,
    area: input.area,
    effectiveDate: input.effectiveDate,
    sourceUrl: input.sourceUrl ?? null,
    note: input.note ?? null,
    isActive: input.isActive,
  };
}

function parse(raw: unknown) {
  const parsed = officialPriceInputSchema.safeParse(raw);
  if (!parsed.success) throw new AppError("errors.invalidInput", 422, fieldErrors(parsed.error));
  return parsed.data;
}

export async function saveOfficialPrice(db: Database, viewer: Viewer | null, id: string | null, raw: unknown) {
  assertStaff(viewer);
  const row = await toRow(db, parse(raw));
  const [saved] = id
    ? await db.update(officialPrices).set({ ...row, updatedAt: new Date() }).where(eq(officialPrices.id, id)).returning({ id: officialPrices.id })
    : await db
        .insert(officialPrices)
        .values({ ...row, createdBy: viewer.id })
        .onConflictDoUpdate({
          target: [officialPrices.source, officialPrices.itemEn, officialPrices.area, officialPrices.effectiveDate],
          set: { ...row, updatedAt: new Date() },
        })
        .returning({ id: officialPrices.id });
  if (!saved) throw new AppError("errors.notFound", 404);
  await db.insert(moderationActions).values({ actorId: viewer.id, targetType: "official_price", targetId: saved.id, action: id ? "update" : "create", meta: { source: row.source, item: row.itemEn } });
  return saved;
}

export async function setOfficialPriceActive(db: Database, viewer: Viewer | null, id: string, isActive: boolean) {
  assertStaff(viewer);
  const updated = await db.update(officialPrices).set({ isActive, updatedAt: new Date() }).where(eq(officialPrices.id, id)).returning({ id: officialPrices.id });
  if (!updated.length) throw new AppError("errors.notFound", 404);
  await db.insert(moderationActions).values({ actorId: viewer.id, targetType: "official_price", targetId: id, action: isActive ? "restore" : "hide" });
}

export interface ImportResult {
  saved: number;
  errors: { line: number; message: string }[];
}

/** Validates every row first; saves nothing if any row is invalid. */
export async function importOfficialPricesCsv(db: Database, viewer: Viewer | null, csv: string): Promise<ImportResult> {
  assertStaff(viewer);
  let rows: ReturnType<typeof csvToInputs>;
  try {
    rows = csvToInputs(csv);
  } catch (e) {
    return { saved: 0, errors: [{ line: 1, message: (e as Error).message }] };
  }
  if (rows.length > 500) return { saved: 0, errors: [{ line: 1, message: "max 500 rows per import" }] };
  const errors: ImportResult["errors"] = [];
  const valid: OfficialPriceInput[] = [];
  for (const { line, raw } of rows) {
    const parsed = officialPriceInputSchema.safeParse(raw);
    if (parsed.success) valid.push(parsed.data);
    else errors.push({ line, message: Object.entries(fieldErrors(parsed.error)).map(([k, v]) => `${k}: ${v}`).join("; ") });
  }
  if (errors.length) return { saved: 0, errors };
  try {
    await db.transaction(async (tx) => {
      for (const input of valid) await saveOfficialPrice(tx as unknown as Database, viewer, null, input);
    });
  } catch (e) {
    const message = e instanceof AppError ? `${e.code}${e.fields ? ` (${Object.keys(e.fields).join(", ")})` : ""}` : "errors.server";
    return { saved: 0, errors: [{ line: 0, message }] };
  }
  return { saved: valid.length, errors: [] };
}

// ---------------------------------------------------------------- reads

const columns = {
  id: officialPrices.id,
  category: officialPrices.category,
  source: officialPrices.source,
  itemBn: officialPrices.itemBn,
  itemEn: officialPrices.itemEn,
  productId: officialPrices.productId,
  productSlug: products.slug,
  priceMin: sql<number>`${officialPrices.priceMin}`.mapWith(Number),
  priceMax: sql<number | null>`${officialPrices.priceMax}`.mapWith((v) => (v === null ? null : Number(v))),
  quantity: sql<number>`${officialPrices.quantity}`.mapWith(Number),
  unit: officialPrices.unit,
  unitLabel: officialPrices.unitLabel,
  baseUnit: officialPrices.baseUnit,
  unitMin: sql<number | null>`${officialPrices.unitMin}`.mapWith((v) => (v === null ? null : Number(v))),
  unitMax: sql<number | null>`${officialPrices.unitMax}`.mapWith((v) => (v === null ? null : Number(v))),
  area: officialPrices.area,
  effectiveDate: officialPrices.effectiveDate,
  sourceUrl: officialPrices.sourceUrl,
  note: officialPrices.note,
  isActive: officialPrices.isActive,
  updatedAt: officialPrices.updatedAt,
};

export type OfficialPrice = Awaited<ReturnType<typeof listOfficialPrices>>[number];

/** Latest entry per (source, item, area); older publications stay as history. */
export async function listOfficialPrices(db: Database, params: { category?: string; q?: string; productSlug?: string; includeInactive?: boolean; latestOnly?: boolean } = {}) {
  const conditions: SQL[] = [];
  if (!params.includeInactive) conditions.push(eq(officialPrices.isActive, true));
  if (params.category && (OFFICIAL_CATEGORIES as readonly string[]).includes(params.category)) {
    conditions.push(eq(officialPrices.category, params.category as (typeof OFFICIAL_CATEGORIES)[number]));
  }
  if (params.q) {
    const p = `%${escapeLike(params.q)}%`;
    conditions.push(or(ilike(officialPrices.itemBn, p), ilike(officialPrices.itemEn, p), ilike(officialPrices.area, p))!);
  }
  if (params.productSlug) conditions.push(eq(products.slug, params.productSlug));
  if (params.latestOnly !== false) {
    conditions.push(sql`${officialPrices.effectiveDate} = (
      select max(o2.effective_date) from ${officialPrices} o2
      where o2.source = ${officialPrices.source} and o2.item_en = ${officialPrices.itemEn} and o2.area = ${officialPrices.area}
        ${params.includeInactive ? sql`` : sql`and o2.is_active`}
    )`);
  }
  return db
    .select(columns)
    .from(officialPrices)
    .leftJoin(products, eq(products.id, officialPrices.productId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(officialPrices.category, desc(officialPrices.effectiveDate), officialPrices.itemEn)
    .limit(1000);
}

/**
 * Latest official prices for a catalog product. With `baseUnit`, only those
 * in the same comparable unit (kg, l, piece…) or the same package unit.
 */
export async function officialPricesForProduct(db: Database, productKey: string, baseUnit?: string | null) {
  const rows = await listOfficialPrices(db, { productSlug: productKey });
  if (baseUnit === undefined) return rows;
  return rows.filter((r) => r.baseUnit === baseUnit);
}

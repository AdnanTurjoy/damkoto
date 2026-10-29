import { and, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { locations, priceReports, products } from "@/db/schema";
import type { Database } from "@/lib/db/client";
import { normalizeKey } from "@/lib/utils";
import { resolveCatalogProduct } from "@/features/categories/queries";
import { publicCondition, type QueryOptions } from "./queries";

export const GROUP_BY = ["division", "district", "upazila", "market"] as const;
export type GroupBy = (typeof GROUP_BY)[number];

/** Brand comparison key computed in SQL (brand is free text). */
const brandKey = sql<string>`lower(trim(coalesce(${priceReports.brand}, '')))`;
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export interface ComparisonSet {
  id: string;
  baseUnit: string;
  variantKey: string;
  variantLabel: string | null;
  brandKey: string;
  brandLabel: string | null;
  count: number;
}

export interface CompareWindow {
  from?: string;
  to?: string;
}

/** Resolves free text ("আলু", "potato", "Alu") to a comparison product key. */
export async function resolveProductKey(db: Database, text: string) {
  const catalog = await resolveCatalogProduct(db, text);
  if (catalog) return { key: catalog.slug, nameBn: catalog.nameBn, nameEn: catalog.nameEn };
  const key = normalizeKey(text);
  if (!key) return null;
  const [row] = await db
    .select({ name: sql<string>`min(${priceReports.productName})` })
    .from(priceReports)
    .where(eq(priceReports.productKey, key));
  return { key, nameBn: row?.name ?? text, nameEn: row?.name ?? text };
}

export async function getProductLabel(db: Database, key: string) {
  const [catalog] = await db.select({ nameBn: products.nameBn, nameEn: products.nameEn }).from(products).where(eq(products.slug, key));
  if (catalog) return catalog;
  const [row] = await db
    .select({ name: sql<string | null>`min(${priceReports.productName})` })
    .from(priceReports)
    .where(eq(priceReports.productKey, key));
  return row?.name ? { nameBn: row.name, nameEn: row.name } : null;
}

function windowConditions(window: CompareWindow): SQL[] {
  const out: SQL[] = [];
  if (window.from) out.push(gte(priceReports.reportDate, window.from));
  if (window.to) out.push(lte(priceReports.reportDate, window.to));
  return out;
}

export function encodeSetId(set: Pick<ComparisonSet, "baseUnit" | "variantKey" | "brandKey">) {
  return [set.baseUnit, set.variantKey, set.brandKey].map(encodeURIComponent).join("|");
}

export function decodeSetId(id: string | undefined) {
  if (!id) return null;
  const parts = id.split("|");
  if (parts.length !== 3) return null;
  const [baseUnit, variantKey, brandKey] = parts.map((p) => {
    try {
      return decodeURIComponent(p);
    } catch {
      return "";
    }
  });
  return baseUnit ? { baseUnit, variantKey, brandKey } : null;
}

/**
 * Distinct comparable groups for a product. Different units, variants or
 * brands are never merged into one average.
 */
export async function getComparisonSets(db: Database, productKey: string, window: CompareWindow, options: QueryOptions) {
  const rows = await db
    .select({
      baseUnit: sql<string>`${priceReports.baseUnit}`,
      variantKey: priceReports.variantKey,
      variantLabel: sql<string | null>`min(coalesce(${priceReports.variant}, ${priceReports.packageDescription}))`,
      brandKey,
      brandLabel: sql<string | null>`min(${priceReports.brand})`,
      count: sql<number>`count(*)::int`,
    })
    .from(priceReports)
    .where(and(publicCondition(options), eq(priceReports.productKey, productKey), ...windowConditions(window)))
    .groupBy(priceReports.baseUnit, priceReports.variantKey, brandKey)
    .orderBy(sql`count(*) desc`)
    .limit(20);
  return rows.map((r) => ({ ...r, id: encodeSetId(r) })) satisfies ComparisonSet[];
}

export interface GroupStat {
  groupId: string;
  nameBn: string;
  nameEn: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  median: number;
  latest: string;
  /** Present when the group has exactly one report. */
  singleReportId: string | null;
}

function groupExpressions(groupBy: GroupBy) {
  switch (groupBy) {
    case "division":
      return { id: sql<string>`${priceReports.divisionId}::text`, join: priceReports.divisionId };
    case "upazila":
      return { id: sql<string>`${priceReports.upazilaId}::text`, join: priceReports.upazilaId };
    case "market":
      return { id: sql<string>`lower(trim(${priceReports.marketName})) || '@' || ${priceReports.districtId}`, join: priceReports.districtId };
    default:
      return { id: sql<string>`${priceReports.districtId}::text`, join: priceReports.districtId };
  }
}

export async function compareGroups(
  db: Database,
  params: { productKey: string; set: { baseUnit: string; variantKey: string; brandKey: string }; groupBy: GroupBy; window: CompareWindow },
  options: QueryOptions,
): Promise<GroupStat[]> {
  const g = groupExpressions(params.groupBy);
  const unitPrice = priceReports.unitPrice;
  const isMarket = params.groupBy === "market";
  const conditions = [
    publicCondition(options),
    eq(priceReports.productKey, params.productKey),
    eq(priceReports.baseUnit, params.set.baseUnit),
    eq(priceReports.variantKey, params.set.variantKey),
    sql`${brandKey} = ${params.set.brandKey}`,
    ...windowConditions(params.window),
  ];
  if (params.groupBy === "upazila") conditions.push(sql`${priceReports.upazilaId} is not null`);
  if (isMarket) conditions.push(sql`${priceReports.marketName} is not null`);

  const rows = await db
    .select({
      groupId: g.id,
      nameBn: isMarket ? sql<string>`min(${priceReports.marketName}) || ', ' || min(${locations.nameBn})` : sql<string>`min(${locations.nameBn})`,
      nameEn: isMarket ? sql<string>`min(${priceReports.marketName}) || ', ' || min(${locations.nameEn})` : sql<string>`min(${locations.nameEn})`,
      count: sql<number>`count(*)::int`,
      min: sql`min(${unitPrice})`.mapWith(num),
      max: sql`max(${unitPrice})`.mapWith(num),
      avg: sql`avg(${unitPrice})`.mapWith(num),
      median: sql`percentile_cont(0.5) within group (order by ${unitPrice})`.mapWith(num),
      latest: sql<string>`max(${priceReports.reportDate})::text`,
      singleReportId: sql<string | null>`case when count(*) = 1 then min(${priceReports.id}::text) end`,
    })
    .from(priceReports)
    .innerJoin(locations, eq(locations.id, g.join))
    .where(and(...conditions))
    .groupBy(g.id)
    .orderBy(sql`count(*) desc`, sql`max(${priceReports.reportDate}) desc`)
    .limit(40);
  return rows as GroupStat[];
}

export interface TrendPoint {
  week: string;
  [series: string]: number | string | null;
}

/**
 * Weekly median comparable price, overall and for the busiest groups.
 * Built only from real report dates — weeks without reports stay empty.
 */
export async function compareTrend(
  db: Database,
  params: { productKey: string; set: { baseUnit: string; variantKey: string; brandKey: string }; groupBy: GroupBy; window: CompareWindow; groupIds: string[] },
  options: QueryOptions,
) {
  const g = groupExpressions(params.groupBy);
  const week = sql<string>`to_char(date_trunc('week', ${priceReports.reportDate}::timestamp), 'YYYY-MM-DD')`;
  const base = and(
    publicCondition(options),
    eq(priceReports.productKey, params.productKey),
    eq(priceReports.baseUnit, params.set.baseUnit),
    eq(priceReports.variantKey, params.set.variantKey),
    sql`${brandKey} = ${params.set.brandKey}`,
    ...windowConditions(params.window),
  );
  const median = sql`percentile_cont(0.5) within group (order by ${priceReports.unitPrice})`.mapWith(num);

  const overall = await db
    .select({ week, median, count: sql<number>`count(*)::int` })
    .from(priceReports)
    .where(base)
    .groupBy(week)
    .orderBy(week);

  const groups = params.groupIds.length
    ? await db
        .select({ week, groupId: g.id, median })
        .from(priceReports)
        .where(and(base, sql`${g.id} in ${params.groupIds}`))
        .groupBy(week, g.id)
        .orderBy(week)
    : [];

  const points = new Map<string, TrendPoint>();
  for (const row of overall) points.set(row.week, { week: row.week, overall: row.median, count: row.count });
  for (const row of groups) {
    const point = points.get(row.week);
    if (point) point[`g_${row.groupId}`] = row.median;
  }
  return [...points.values()];
}

/** The most-reported product with reports from ≥2 districts in the window. */
export async function topComparableProduct(db: Database, window: CompareWindow, options: QueryOptions) {
  const [row] = await db
    .select({
      productKey: priceReports.productKey,
      baseUnit: sql<string>`${priceReports.baseUnit}`,
      variantKey: priceReports.variantKey,
      brandKey,
      name: sql<string>`min(${priceReports.productName})`,
      count: sql<number>`count(*)::int`,
    })
    .from(priceReports)
    .where(and(publicCondition(options), ...windowConditions(window)))
    .groupBy(priceReports.productKey, priceReports.baseUnit, priceReports.variantKey, brandKey)
    .having(sql`count(distinct ${priceReports.districtId}) >= 2`)
    .orderBy(desc(sql`count(*)`))
    .limit(1);
  return row ?? null;
}

/** Products with the widest relative price spread across districts. */
export async function biggestSpreads(db: Database, window: CompareWindow, options: QueryOptions, limit = 4) {
  return db
    .select({
      productKey: priceReports.productKey,
      baseUnit: sql<string>`${priceReports.baseUnit}`,
      variantKey: priceReports.variantKey,
      brandKey,
      name: sql<string>`min(${priceReports.productName})`,
      catalogBn: sql<string | null>`min(${products.nameBn})`,
      catalogEn: sql<string | null>`min(${products.nameEn})`,
      min: sql`min(${priceReports.unitPrice})`.mapWith(num),
      max: sql`max(${priceReports.unitPrice})`.mapWith(num),
      count: sql<number>`count(*)::int`,
      areas: sql<number>`count(distinct ${priceReports.districtId})::int`,
      latest: sql<string>`max(${priceReports.reportDate})::text`,
    })
    .from(priceReports)
    .leftJoin(products, eq(products.id, priceReports.productId))
    .where(and(publicCondition(options), ...windowConditions(window)))
    .groupBy(priceReports.productKey, priceReports.baseUnit, priceReports.variantKey, brandKey)
    .having(sql`count(distinct ${priceReports.districtId}) >= 2 and min(${priceReports.unitPrice}) > 0`)
    .orderBy(desc(sql`max(${priceReports.unitPrice}) / min(${priceReports.unitPrice})`))
    .limit(limit);
}

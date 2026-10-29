import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { categories, locations, priceReports, products } from "@/db/schema";
import type { Database } from "@/lib/db/client";
import { escapeLike, normalizeKey } from "@/lib/utils";
import { dateWindow, type PriceFilters } from "./filters";

export const divisionLoc = alias(locations, "division_loc");
export const districtLoc = alias(locations, "district_loc");
export const upazilaLoc = alias(locations, "upazila_loc");

export interface QueryOptions {
  showDemo: boolean;
}

/** Only published reports are ever public; demo rows only when explicitly enabled. */
export function publicCondition(options: QueryOptions): SQL {
  return options.showDemo
    ? eq(priceReports.status, "published")
    : and(eq(priceReports.status, "published"), eq(priceReports.isDemo, false))!;
}

function categoryCondition(slug: string): SQL {
  return sql`${priceReports.categoryId} in (
    select c.id from ${categories} c
    where c.slug = ${slug}
       or c.parent_id = (select p.id from ${categories} p where p.slug = ${slug})
  )`;
}

export function searchCondition(q: string): SQL {
  const pattern = `%${escapeLike(q)}%`;
  const key = normalizeKey(q);
  const keyPattern = `%${escapeLike(key)}%`;
  return or(
    ilike(priceReports.productName, pattern),
    ilike(priceReports.brand, pattern),
    ilike(priceReports.variant, pattern),
    sql`${priceReports.productName} % ${q}`,
    sql`${priceReports.productId} in (
      select p.id from ${products} p
      where p.name_bn ilike ${pattern} or p.name_en ilike ${pattern}
         or exists (select 1 from unnest(p.aliases) a where a like ${keyPattern})
    )`,
    sql`${priceReports.categoryId} in (
      select c.id from ${categories} c where c.name_bn ilike ${pattern} or c.name_en ilike ${pattern}
    )`,
  )!;
}

/** Translates validated filters into SQL conditions. Every filter hits the database. */
export function filterConditions(filters: PriceFilters, options: QueryOptions): SQL[] {
  const conditions: SQL[] = [publicCondition(options)];
  const r = priceReports;

  if (filters.q) conditions.push(searchCondition(filters.q));
  if (filters.product) conditions.push(eq(r.productKey, filters.product));
  if (filters.category) conditions.push(categoryCondition(filters.category));
  if (filters.brand) conditions.push(ilike(r.brand, `%${escapeLike(filters.brand)}%`));
  if (filters.variant) conditions.push(ilike(r.variant, `%${escapeLike(filters.variant)}%`));
  if (filters.unit) conditions.push(eq(r.unit, filters.unit));
  if (filters.base) conditions.push(eq(r.baseUnit, filters.base));
  if (filters.condition) conditions.push(eq(r.condition, filters.condition));
  if (filters.division) conditions.push(eq(r.divisionId, filters.division));
  if (filters.district) conditions.push(eq(r.districtId, filters.district));
  if (filters.upazila) conditions.push(eq(r.upazilaId, filters.upazila));
  if (filters.locality) conditions.push(ilike(r.locality, `%${escapeLike(filters.locality)}%`));
  if (filters.market) conditions.push(ilike(r.marketName, `%${escapeLike(filters.market)}%`));

  // With a comparable unit selected, the price range applies to the per-unit price.
  const priceColumn = filters.base ? r.unitPrice : r.price;
  if (filters.minPrice !== undefined) conditions.push(gte(priceColumn, String(filters.minPrice)));
  if (filters.maxPrice !== undefined) conditions.push(lte(priceColumn, String(filters.maxPrice)));

  const { from, to } = dateWindow(filters);
  if (from) conditions.push(gte(r.reportDate, from));
  if (to) conditions.push(lte(r.reportDate, to));

  if (filters.hasImage) conditions.push(isNotNull(r.imageUrl));
  if (filters.hasComments) conditions.push(sql`${r.commentCount} > 0`);
  if (filters.named) conditions.push(isNotNull(r.displayName));
  if (filters.hasMarket) conditions.push(isNotNull(r.marketName));

  if (filters.bbox) {
    const [w, s, e, n] = filters.bbox;
    conditions.push(sql`${r.lat} between ${s} and ${n}`, sql`${r.lng} between ${w} and ${e}`);
  }
  if (filters.near) {
    const { lat, lng, km } = filters.near;
    const dLat = km / 111;
    const dLng = km / (111 * Math.cos((lat * Math.PI) / 180));
    conditions.push(
      sql`${r.lat} between ${lat - dLat} and ${lat + dLat}`,
      sql`${r.lng} between ${lng - dLng} and ${lng + dLng}`,
      sql`6371 * 2 * asin(sqrt(power(sin(radians(${r.lat} - ${lat}) / 2), 2) + cos(radians(${lat})) * cos(radians(${r.lat})) * power(sin(radians(${r.lng} - ${lng}) / 2), 2))) <= ${km}`,
    );
  }
  return conditions;
}

function orderFor(sort: PriceFilters["sort"]): SQL[] {
  const r = priceReports;
  switch (sort) {
    case "oldest":
      return [asc(r.reportDate), asc(r.createdAt)];
    case "unit_asc":
      // Group by comparable unit first so incompatible units are never interleaved.
      return [asc(r.baseUnit), sql`${r.unitPrice} asc nulls last`, desc(r.reportDate)];
    case "unit_desc":
      return [asc(r.baseUnit), sql`${r.unitPrice} desc nulls last`, desc(r.reportDate)];
    case "discussed":
      return [desc(r.commentCount), desc(r.reportDate), desc(r.createdAt)];
    case "sample":
      return [sql`count(*) over (partition by ${r.productKey}, ${r.baseUnit}) desc`, asc(r.productKey), desc(r.reportDate)];
    default:
      return [desc(r.reportDate), desc(r.createdAt)];
  }
}

export const reportSummaryColumns = {
  id: priceReports.id,
  productName: priceReports.productName,
  productKey: priceReports.productKey,
  brand: priceReports.brand,
  variant: priceReports.variant,
  price: sql<number>`${priceReports.price}`.mapWith(Number),
  quantity: sql<number>`${priceReports.quantity}`.mapWith(Number),
  unit: priceReports.unit,
  packageDescription: priceReports.packageDescription,
  baseUnit: priceReports.baseUnit,
  unitPrice: sql<number | null>`${priceReports.unitPrice}`.mapWith((v) => (v === null ? null : Number(v))),
  reportDate: priceReports.reportDate,
  purchaseDate: priceReports.purchaseDate,
  createdAt: priceReports.createdAt,
  displayName: priceReports.displayName,
  imageUrl: priceReports.imageUrl,
  imageWidth: priceReports.imageWidth,
  imageHeight: priceReports.imageHeight,
  marketName: priceReports.marketName,
  locality: priceReports.locality,
  commentCount: priceReports.commentCount,
  isDemo: priceReports.isDemo,
  status: priceReports.status,
  lat: priceReports.lat,
  lng: priceReports.lng,
  locationMethod: priceReports.locationMethod,
  districtId: priceReports.districtId,
  categorySlug: categories.slug,
  categoryIcon: categories.icon,
  categoryNameBn: categories.nameBn,
  categoryNameEn: categories.nameEn,
  districtNameBn: districtLoc.nameBn,
  districtNameEn: districtLoc.nameEn,
  upazilaNameBn: upazilaLoc.nameBn,
  upazilaNameEn: upazilaLoc.nameEn,
};

function summaryQuery(db: Database) {
  return db
    .select(reportSummaryColumns)
    .from(priceReports)
    .innerJoin(categories, eq(categories.id, priceReports.categoryId))
    .innerJoin(districtLoc, eq(districtLoc.id, priceReports.districtId))
    .leftJoin(upazilaLoc, eq(upazilaLoc.id, priceReports.upazilaId));
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
}

export async function listReports(
  db: Database,
  filters: PriceFilters,
  options: QueryOptions & { pageSize?: number },
): Promise<Paginated<ReportSummary>> {
  const pageSize = options.pageSize ?? 20;
  const where = and(...filterConditions(filters, options));
  const [items, [{ total }]] = await Promise.all([
    summaryQuery(db)
      .where(where)
      .orderBy(...orderFor(filters.sort))
      .limit(pageSize)
      .offset((filters.page - 1) * pageSize),
    db.select({ total: sql<number>`count(*)::int` }).from(priceReports).where(where),
  ]);
  return { items, total, page: filters.page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getReportSummaries(db: Database, where: SQL, limit: number, order: SQL[] = orderFor("recent")) {
  return summaryQuery(db).where(where).orderBy(...order).limit(limit);
}

export type ReportSummary = Awaited<ReturnType<typeof getReportSummaries>>[number];

/** Full report row with joined names, regardless of status (callers check visibility). */
export async function getReportDetail(db: Database, id: string) {
  const [row] = await db
    .select({
      ...reportSummaryColumns,
      categoryId: priceReports.categoryId,
      parentCategoryNameBn: sql<string | null>`(select p.name_bn from ${categories} p where p.id = ${categories.parentId})`,
      parentCategoryNameEn: sql<string | null>`(select p.name_en from ${categories} p where p.id = ${categories.parentId})`,
      condition: priceReports.condition,
      note: priceReports.note,
      currency: priceReports.currency,
      variantKey: priceReports.variantKey,
      upazilaId: priceReports.upazilaId,
      divisionId: priceReports.divisionId,
      divisionNameBn: divisionLoc.nameBn,
      divisionNameEn: divisionLoc.nameEn,
      submitterHash: priceReports.submitterHash,
      contributorId: priceReports.contributorId,
      flags: priceReports.flags,
      updatedAt: priceReports.updatedAt,
    })
    .from(priceReports)
    .innerJoin(categories, eq(categories.id, priceReports.categoryId))
    .innerJoin(districtLoc, eq(districtLoc.id, priceReports.districtId))
    .innerJoin(divisionLoc, eq(divisionLoc.id, priceReports.divisionId))
    .leftJoin(upazilaLoc, eq(upazilaLoc.id, priceReports.upazilaId))
    .where(eq(priceReports.id, id));
  return row ?? null;
}

export type ReportDetail = NonNullable<Awaited<ReturnType<typeof getReportDetail>>>;

export async function getRelatedReports(db: Database, report: ReportDetail, options: QueryOptions) {
  const base = publicCondition(options);
  const [sameProduct, nearby] = await Promise.all([
    getReportSummaries(
      db,
      and(base, ne(priceReports.id, report.id), eq(priceReports.productKey, report.productKey), eq(priceReports.baseUnit, report.baseUnit ?? ""))!,
      6,
    ),
    getReportSummaries(db, and(base, ne(priceReports.id, report.id), eq(priceReports.districtId, report.districtId))!, 6),
  ]);
  return { sameProduct, nearby };
}

export async function getSitemapReports(db: Database, limit = 5000) {
  return db
    .select({ id: priceReports.id, updatedAt: priceReports.updatedAt })
    .from(priceReports)
    .where(publicCondition({ showDemo: false }))
    .orderBy(desc(priceReports.updatedAt))
    .limit(limit);
}

export async function getReportsByIds(db: Database, ids: string[], options: QueryOptions) {
  if (!ids.length) return [];
  return getReportSummaries(db, and(publicCondition(options), inArray(priceReports.id, ids))!, ids.length);
}

import { and, gte, sql } from "drizzle-orm";
import { categories, priceReports, products } from "@/db/schema";
import type { Database } from "@/lib/db/client";
import { dhakaToday, shiftDate } from "@/lib/utils";
import { biggestSpreads, compareGroups, topComparableProduct } from "./compare";
import { getReportSummaries, publicCondition, type QueryOptions } from "./queries";

/** Real, database-driven homepage sections. Nothing here is fabricated. */
export async function getHomeData(db: Database, options: QueryOptions) {
  const today = dhakaToday();
  const base = publicCondition(options);
  const last30 = { from: shiftDate(today, -29), to: today };

  const [[stats], recent, vegetables, spreads, top, catalogNames] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        districts: sql<number>`count(distinct ${priceReports.districtId})::int`,
        week: sql<number>`count(*) filter (where ${priceReports.reportDate} >= ${shiftDate(today, -6)})::int`,
      })
      .from(priceReports)
      .where(base),
    getReportSummaries(db, base, 8),
    getReportSummaries(
      db,
      and(
        base,
        gte(priceReports.reportDate, shiftDate(today, -6)),
        sql`${priceReports.categoryId} in (select c.id from ${categories} c where c.slug = 'vegetables' or c.parent_id = (select p.id from ${categories} p where p.slug = 'vegetables'))`,
      )!,
      8,
    ),
    biggestSpreads(db, last30, options),
    topComparableProduct(db, last30, options),
    db.select({ nameBn: products.nameBn, nameEn: products.nameEn }).from(products).limit(80),
  ]);

  const comparison = top
    ? {
        product: top,
        groups: (await compareGroups(db, { productKey: top.productKey, set: top, groupBy: "district", window: last30 }, options)).slice(0, 5),
      }
    : null;

  return { stats, recent, vegetables, spreads, comparison, catalogNames };
}

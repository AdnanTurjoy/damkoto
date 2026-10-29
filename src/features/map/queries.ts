import { and, desc, isNotNull, sql } from "drizzle-orm";
import { priceReports } from "@/db/schema";
import type { Database } from "@/lib/db/client";
import type { PriceFilters } from "@/features/prices/filters";
import { filterConditions, type QueryOptions } from "@/features/prices/queries";

/** Above this many reports in view, the server returns grid clusters instead. */
export const MAX_POINTS = 250;

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  productName: string;
  price: number;
  quantity: number;
  unit: string;
  reportDate: string;
  imageUrl: string | null;
  isDemo: boolean;
  approximate: boolean;
}

export interface MapCluster {
  lat: number;
  lng: number;
  count: number;
}

export type MapData = { mode: "points"; total: number; points: MapPoint[] } | { mode: "clusters"; total: number; clusters: MapCluster[] };

/**
 * Viewport-bounded map query. Coordinates stored are already approximate
 * (~100 m) so no precise location is ever returned.
 */
export async function getMapData(db: Database, filters: PriceFilters, zoom: number, options: QueryOptions): Promise<MapData> {
  const where = and(...filterConditions(filters, options), isNotNull(priceReports.lat), isNotNull(priceReports.lng));
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(priceReports).where(where);

  if (total <= MAX_POINTS) {
    const rows = await db
      .select({
        id: priceReports.id,
        lat: sql<number>`${priceReports.lat}`,
        lng: sql<number>`${priceReports.lng}`,
        productName: priceReports.productName,
        price: sql<number>`${priceReports.price}`.mapWith(Number),
        quantity: sql<number>`${priceReports.quantity}`.mapWith(Number),
        unit: priceReports.unit,
        reportDate: priceReports.reportDate,
        imageUrl: priceReports.imageUrl,
        isDemo: priceReports.isDemo,
        approximate: sql<boolean>`${priceReports.locationMethod} = 'admin'`,
      })
      .from(priceReports)
      .where(where)
      .orderBy(desc(priceReports.reportDate))
      .limit(MAX_POINTS);
    return { mode: "points", total, points: rows };
  }

  // Roughly 60px grid cells at the current zoom level.
  const cell = 360 / 2 ** Math.min(Math.max(Math.round(zoom), 3), 18) / 4;
  const cellLat = sql`floor(${priceReports.lat} / ${cell})`;
  const cellLng = sql`floor(${priceReports.lng} / ${cell})`;
  const clusters = await db
    .select({
      lat: sql<number>`avg(${priceReports.lat})`.mapWith(Number),
      lng: sql<number>`avg(${priceReports.lng})`.mapWith(Number),
      count: sql<number>`count(*)::int`,
    })
    .from(priceReports)
    .where(where)
    .groupBy(cellLat, cellLng)
    .limit(2000);
  return { mode: "clusters", total, clusters };
}

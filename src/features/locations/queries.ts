import { and, asc, eq, ne } from "drizzle-orm";
import { locations } from "@/db/schema";
import type { Database } from "@/lib/db/client";
import { haversineKm } from "@/lib/utils";

export interface LocationOption {
  id: number;
  parentId: number | null;
  slug: string;
  nameBn: string;
  nameEn: string;
  lat: number | null;
  lng: number | null;
}

const columns = {
  id: locations.id,
  parentId: locations.parentId,
  slug: locations.slug,
  nameBn: locations.nameBn,
  nameEn: locations.nameEn,
  lat: locations.lat,
  lng: locations.lng,
};

/** Divisions and districts are small (72 rows) and shipped with pages that need them. */
export async function getDivisionsAndDistricts(db: Database) {
  // Upazilas (~500) are loaded on demand per district.
  const rows = await db
    .select({ ...columns, level: locations.level })
    .from(locations)
    .where(ne(locations.level, "upazila"))
    .orderBy(asc(locations.nameEn));
  return {
    divisions: rows.filter((r) => r.level === "division") as LocationOption[],
    districts: rows.filter((r) => r.level === "district") as LocationOption[],
  };
}

export async function getUpazilas(db: Database, districtId: number): Promise<LocationOption[]> {
  return db
    .select(columns)
    .from(locations)
    .where(and(eq(locations.level, "upazila"), eq(locations.parentId, districtId)))
    .orderBy(asc(locations.nameEn));
}

export async function getLocationBySlug(db: Database, slug: string) {
  const [row] = await db.select().from(locations).where(eq(locations.slug, slug));
  return row ?? null;
}

export async function getLocationById(db: Database, id: number) {
  const [row] = await db.select().from(locations).where(eq(locations.id, id));
  return row ?? null;
}

/** Nearest district centroid — offline reverse lookup, no external geocoder. */
export function nearestDistrict<T extends { lat: number | null; lng: number | null }>(
  districts: T[],
  point: { lat: number; lng: number },
): T | null {
  let best: T | null = null;
  let bestDistance = Infinity;
  for (const d of districts) {
    if (d.lat == null || d.lng == null) continue;
    const distance = haversineKm(point, { lat: d.lat, lng: d.lng });
    if (distance < bestDistance) {
      bestDistance = distance;
      best = d;
    }
  }
  return best;
}

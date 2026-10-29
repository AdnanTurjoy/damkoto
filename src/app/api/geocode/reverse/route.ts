import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { env, features } from "@/config/env";
import { siteConfig } from "@/config/site";
import { geocodeCache } from "@/db/schema";
import { getDivisionsAndDistricts, nearestDistrict } from "@/features/locations/queries";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { handle, ok } from "@/lib/http";

/**
 * GET /api/geocode/reverse?lat=&lng= — nearest district (computed offline
 * from district centroids) plus, when a geocoder is configured, a suggested
 * locality name. Geocoder results are cached by ~1 km cell to stay well
 * within provider usage policies.
 */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const lat = Number(request.nextUrl.searchParams.get("lat"));
    const lng = Number(request.nextUrl.searchParams.get("lng"));
    const [south, west, north, east] = siteConfig.map.bounds;
    if (!(lat >= south && lat <= north && lng >= west && lng <= east)) throw new AppError("location.outsideBd", 422);

    const db = await getDb();
    const { districts } = await getDivisionsAndDistricts(db);
    const district = nearestDistrict(districts, { lat, lng });
    let locality: string | null = null;

    if (features.geocoding) {
      const key = `rev:${lat.toFixed(2)},${lng.toFixed(2)}`;
      const [cached] = await db.select().from(geocodeCache).where(eq(geocodeCache.key, key));
      if (cached) {
        locality = (cached.result as { locality: string | null }).locality;
      } else {
        try {
          const url = `${env.geocoder.nominatimUrl}/reverse?format=jsonv2&zoom=16&accept-language=bn,en&lat=${lat}&lon=${lng}`;
          const response = await fetch(url, { headers: { "User-Agent": env.geocoder.userAgent! }, signal: AbortSignal.timeout(4000) });
          if (response.ok) {
            const data = (await response.json()) as { address?: Record<string, string> };
            const a = data.address ?? {};
            locality = a.suburb ?? a.neighbourhood ?? a.village ?? a.town ?? a.city_district ?? null;
            await db.insert(geocodeCache).values({ key, result: { locality } }).onConflictDoNothing();
          }
        } catch {
          // Geocoding is optional; the district lookup above still works.
        }
      }
    }

    return ok({ districtId: district?.id ?? null, divisionId: district?.parentId ?? null, locality });
  });
}

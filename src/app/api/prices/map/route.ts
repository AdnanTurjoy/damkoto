import type { NextRequest } from "next/server";
import { parsePriceFilters } from "@/features/prices/filters";
import { getMapData } from "@/features/map/queries";
import { getDb } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { queryOptions } from "@/lib/server-context";

/** GET /api/prices/map?bbox=w,s,e,n&zoom=&…filters — points or clusters in view. */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const params = request.nextUrl.searchParams;
    const filters = parsePriceFilters(params);
    const zoom = Number(params.get("zoom")) || 7;
    return ok(await getMapData(await getDb(), filters, zoom, queryOptions()));
  });
}

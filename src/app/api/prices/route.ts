import type { NextRequest } from "next/server";
import { siteConfig } from "@/config/site";
import { parsePriceFilters } from "@/features/prices/filters";
import { listReports } from "@/features/prices/queries";
import { getDb } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { queryOptions } from "@/lib/server-context";

/** GET /api/prices — paginated, filtered published reports (public, read-only). */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const filters = parsePriceFilters(request.nextUrl.searchParams);
    const pageSize = Math.min(Number(request.nextUrl.searchParams.get("pageSize")) || siteConfig.pageSize, 50);
    return ok(await listReports(await getDb(), filters, { ...queryOptions(), pageSize }));
  });
}

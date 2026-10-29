import type { NextRequest } from "next/server";
import { getDivisionsAndDistricts, getUpazilas } from "@/features/locations/queries";
import { getDb } from "@/lib/db";
import { handle, ok } from "@/lib/http";

/** GET /api/locations — divisions + districts; ?district=ID → its upazilas. */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const db = await getDb();
    const district = Number(request.nextUrl.searchParams.get("district"));
    const data = Number.isInteger(district) && district > 0 ? { upazilas: await getUpazilas(db, district) } : await getDivisionsAndDistricts(db);
    return ok(data, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
  });
}

import type { NextRequest } from "next/server";
import { loadComparison } from "@/features/prices/compare-page";
import { getDb } from "@/lib/db";
import { handle, ok } from "@/lib/http";

/** GET /api/prices/trends — weekly medians for the selected comparison. */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const result = await loadComparison(await getDb(), request.nextUrl.searchParams);
    return ok({ product: result.product, set: result.activeSet, trend: result.trend });
  });
}

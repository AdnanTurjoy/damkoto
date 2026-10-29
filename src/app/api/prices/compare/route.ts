import type { NextRequest } from "next/server";
import { loadComparison } from "@/features/prices/compare-page";
import { getDb } from "@/lib/db";
import { handle, ok } from "@/lib/http";

/** GET /api/prices/compare?product=&set=&groupBy=&period= — grouped statistics. */
export async function GET(request: NextRequest) {
  return handle(async () => ok(await loadComparison(await getDb(), request.nextUrl.searchParams)));
}

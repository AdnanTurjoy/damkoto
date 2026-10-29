import type { NextRequest } from "next/server";
import { suggestProducts } from "@/features/categories/queries";
import { getDb } from "@/lib/db";
import { handle, ok } from "@/lib/http";

/** GET /api/products/suggest?q= — catalog and frequently reported product names. */
export async function GET(request: NextRequest) {
  return handle(async () => {
    const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
    if (q.length < 1) return ok([]);
    return ok(await suggestProducts(await getDb(), q));
  });
}

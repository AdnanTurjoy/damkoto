import { getCategoryTree } from "@/features/categories/queries";
import { getDb } from "@/lib/db";
import { handle, ok } from "@/lib/http";

/** GET /api/categories — active category tree. */
export async function GET() {
  return handle(async () => ok(await getCategoryTree(await getDb())));
}

import { getReportDetail } from "@/features/prices/queries";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { handle, ok } from "@/lib/http";
import { queryOptions } from "@/lib/server-context";

const UUID_RE = /^[0-9a-f-]{36}$/i;

/** GET /api/prices/:id — a single published report without private fields. */
export async function GET(_: Request, ctx: RouteContext<"/api/prices/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) throw new AppError("errors.notFound", 404);
    const report = await getReportDetail(await getDb(), id);
    if (!report || report.status !== "published" || (report.isDemo && !queryOptions().showDemo)) {
      throw new AppError("errors.notFound", 404);
    }
    const { submitterHash: _hash, contributorId: _contributor, flags: _flags, ...publicFields } = report;
    return ok(publicFields);
  });
}

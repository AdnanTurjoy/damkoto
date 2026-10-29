import type { NextRequest } from "next/server";
import { listComments } from "@/features/comments/service";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { handle, ok } from "@/lib/http";
import { getActor } from "@/lib/server-context";

/** GET /api/prices/:id/comments?cursor= — next page of comments. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/prices/[id]/comments">) {
  return handle(async () => {
    const { id } = await ctx.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError("errors.notFound", 404);
    const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;
    return ok(await listComments(await getDb(), id, await getActor(), cursor));
  });
}

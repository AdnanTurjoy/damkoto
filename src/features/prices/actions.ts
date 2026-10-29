"use server";

import { revalidatePath } from "next/cache";
import { env } from "@/config/env";
import { getDb } from "@/lib/db";
import { AppError, toActionError, type ActionResult } from "@/lib/errors";
import { getIpHash } from "@/lib/identity";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getWriteActor } from "@/lib/server-context";
import { createPriceReport, deletePriceReport, updatePriceReport, type SubmitContext } from "./service";

async function submitContext(): Promise<SubmitContext> {
  const actor = await getWriteActor();
  return { ...actor, moderationMode: env.moderationMode, imageCloudName: env.cloudinary.cloudName };
}

export async function submitPriceReportAction(input: unknown): Promise<ActionResult<{ id: string; status: string }>> {
  try {
    const db = await getDb();
    const ctx = await submitContext();
    const [clientOk, ipOk] = await Promise.all([
      consumeRateLimit(db, `report:c:${ctx.clientHash}`, RATE_LIMITS.reportPerClient),
      consumeRateLimit(db, `report:ip:${await getIpHash()}`, RATE_LIMITS.reportPerIp),
    ]);
    if (!clientOk || !ipOk) throw new AppError("errors.rateLimited", 429);
    const created = await createPriceReport(db, input, ctx);
    revalidatePath("/", "layout");
    return { ok: true, data: created };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updatePriceReportAction(id: string, input: unknown): Promise<ActionResult<{ id: string; status: string }>> {
  try {
    const db = await getDb();
    const updated = await updatePriceReport(db, String(id), input, await submitContext());
    revalidatePath("/", "layout");
    return { ok: true, data: updated };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deletePriceReportAction(id: string): Promise<ActionResult> {
  try {
    const db = await getDb();
    await deletePriceReport(db, String(id), await getWriteActor());
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

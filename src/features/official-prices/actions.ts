"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { toActionError, type ActionResult } from "@/lib/errors";
import { importOfficialPricesCsv, saveOfficialPrice, setOfficialPriceActive, type ImportResult } from "./service";

// Role checks happen inside the service on every call.

export async function saveOfficialPriceAction(id: string | null, input: unknown): Promise<ActionResult> {
  try {
    await saveOfficialPrice(await getDb(), await getViewer(), id ? String(id) : null, input);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setOfficialPriceActiveAction(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    await setOfficialPriceActive(await getDb(), await getViewer(), String(id), Boolean(isActive));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function importOfficialPricesAction(csv: string): Promise<ActionResult<ImportResult>> {
  try {
    const result = await importOfficialPricesCsv(await getDb(), await getViewer(), String(csv).slice(0, 500_000));
    if (result.saved) revalidatePath("/", "layout");
    return { ok: true, data: result };
  } catch (error) {
    return toActionError(error);
  }
}

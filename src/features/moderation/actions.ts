"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { toActionError, type ActionResult } from "@/lib/errors";
import {
  moderateComment,
  moderateReport,
  resolveContentReport,
  saveCategory,
  setUserRole,
  type CommentAction,
  type ReportAction,
} from "./service";

// Every action re-checks the role server-side inside the service layer;
// hiding admin UI is never relied upon for authorization.

const note = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim().slice(0, 500) : null);

export async function moderateReportAction(id: string, action: ReportAction, moderationNote?: string): Promise<ActionResult> {
  try {
    await moderateReport(await getDb(), await getViewer(), String(id), action, note(moderationNote));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function moderateCommentAction(id: string, action: CommentAction, moderationNote?: string): Promise<ActionResult> {
  try {
    await moderateComment(await getDb(), await getViewer(), String(id), action, note(moderationNote));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function resolveFlagAction(id: string, resolution: "resolve" | "dismiss", moderationNote?: string): Promise<ActionResult> {
  try {
    await resolveContentReport(await getDb(), await getViewer(), String(id), resolution === "resolve" ? "resolve" : "dismiss", note(moderationNote));
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveCategoryAction(id: string | null, input: unknown): Promise<ActionResult> {
  try {
    await saveCategory(await getDb(), await getViewer(), id ? String(id) : null, input);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setRoleAction(userId: string, role: "user" | "moderator" | "admin"): Promise<ActionResult> {
  try {
    await setUserRole(await getDb(), await getViewer(), String(userId), role);
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

"use server";

import { getDb } from "@/lib/db";
import { AppError, toActionError, type ActionResult } from "@/lib/errors";
import { getIpHash } from "@/lib/identity";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getWriteActor } from "@/lib/server-context";
import { createContentReport } from "@/features/moderation/service";
import { createComment, deleteComment, editComment, toggleReaction, type CommentView } from "./service";

export async function addCommentAction(input: unknown): Promise<ActionResult<CommentView>> {
  try {
    const db = await getDb();
    const actor = await getWriteActor();
    const [clientOk, ipOk] = await Promise.all([
      consumeRateLimit(db, `comment:c:${actor.clientHash}`, RATE_LIMITS.commentPerClient),
      consumeRateLimit(db, `comment:ip:${await getIpHash()}`, RATE_LIMITS.commentPerIp),
    ]);
    if (!clientOk || !ipOk) throw new AppError("errors.rateLimited", 429);
    return { ok: true, data: await createComment(db, input, actor) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function editCommentAction(input: unknown): Promise<ActionResult<CommentView>> {
  try {
    const db = await getDb();
    return { ok: true, data: await editComment(db, input, await getWriteActor()) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteCommentAction(id: string): Promise<ActionResult> {
  try {
    const db = await getDb();
    await deleteComment(db, String(id), await getWriteActor());
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function toggleReactionAction(
  input: unknown,
): Promise<ActionResult<{ stickerId: string; count: number; mine: boolean }[]>> {
  try {
    const db = await getDb();
    const actor = await getWriteActor();
    if (!(await consumeRateLimit(db, `sticker:c:${actor.clientHash}`, RATE_LIMITS.stickerPerClient))) {
      throw new AppError("errors.rateLimited", 429);
    }
    return { ok: true, data: await toggleReaction(db, input, actor.clientHash) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function flagContentAction(input: unknown): Promise<ActionResult> {
  try {
    const db = await getDb();
    const actor = await getWriteActor();
    if (!(await consumeRateLimit(db, `flag:c:${actor.clientHash}`, RATE_LIMITS.flagPerClient))) {
      throw new AppError("errors.rateLimited", 429);
    }
    await createContentReport(db, input, actor.clientHash);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

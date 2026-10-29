import { and, asc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { comments, locations, priceReports, reportReactions } from "@/db/schema";
import type { Database } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { containsBlockedLanguage } from "@/lib/content-checks";
import { canModifyComment, type Actor } from "@/features/auth/permissions";
import { fieldErrors } from "@/schemas/price-report";
import { commentEditSchema, commentInputSchema, reactionInputSchema } from "@/schemas/community";
import { STICKER_IDS } from "./stickers";

export const COMMENTS_PAGE_SIZE = 20;

const districtLoc = alias(locations, "comment_district");
const upazilaLoc = alias(locations, "comment_upazila");

export interface CommentView {
  id: string;
  parentId: string | null;
  displayName: string | null;
  body: string | null;
  stickerId: string | null;
  placeBn: string | null;
  placeEn: string | null;
  createdAt: string;
  edited: boolean;
  deleted: boolean;
  canModify: boolean;
}

async function selectComments(db: Database, where: ReturnType<typeof and>, actor: Actor, limit?: number) {
  const query = db
    .select({
      id: comments.id,
      parentId: comments.parentId,
      displayName: comments.displayName,
      body: comments.body,
      stickerId: comments.stickerId,
      locality: comments.locality,
      districtBn: districtLoc.nameBn,
      districtEn: districtLoc.nameEn,
      upazilaBn: upazilaLoc.nameBn,
      upazilaEn: upazilaLoc.nameEn,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      deletedAt: comments.deletedAt,
      status: comments.status,
      authorHash: comments.authorHash,
      authorId: comments.authorId,
    })
    .from(comments)
    .leftJoin(districtLoc, eq(districtLoc.id, comments.districtId))
    .leftJoin(upazilaLoc, eq(upazilaLoc.id, comments.upazilaId))
    .where(where)
    .orderBy(asc(comments.createdAt), asc(comments.id));
  const rows = limit ? await query.limit(limit) : await query;
  return rows.map(
    (r): CommentView => ({
      id: r.id,
      parentId: r.parentId,
      displayName: r.deletedAt ? null : r.displayName,
      body: r.deletedAt ? null : r.body,
      stickerId: r.deletedAt ? null : r.stickerId,
      placeBn: [r.locality, r.upazilaBn, r.districtBn].filter(Boolean).join(", ") || null,
      placeEn: [r.locality, r.upazilaEn, r.districtEn].filter(Boolean).join(", ") || null,
      createdAt: r.createdAt.toISOString(),
      edited: r.updatedAt.getTime() - r.createdAt.getTime() > 60_000,
      deleted: Boolean(r.deletedAt),
      canModify: canModifyComment(
        { ownerHash: r.authorHash, ownerId: r.authorId, createdAt: r.createdAt, status: r.status, deletedAt: r.deletedAt },
        actor,
      ),
    }),
  );
}

/**
 * Top-level comments in chronological order (cursor = last seen createdAt|id),
 * with all of their published replies. Deleted parents stay as placeholders
 * only when they still have visible replies.
 */
export async function listComments(db: Database, reportId: string, actor: Actor, cursor?: string) {
  const conditions = [eq(comments.reportId, reportId), isNull(comments.parentId), eq(comments.status, "published")];
  if (cursor) {
    const [at, id] = cursor.split("|");
    const date = new Date(at);
    if (!Number.isNaN(date.getTime()) && id) {
      conditions.push(or(gt(comments.createdAt, date), and(eq(comments.createdAt, date), gt(comments.id, id)))!);
    }
  }
  const parents = await selectComments(db, and(...conditions), actor, COMMENTS_PAGE_SIZE + 1);
  const hasMore = parents.length > COMMENTS_PAGE_SIZE;
  const page = parents.slice(0, COMMENTS_PAGE_SIZE);
  const replies = page.length
    ? await selectComments(
        db,
        and(inArray(comments.parentId, page.map((p) => p.id)), eq(comments.status, "published"), isNull(comments.deletedAt)),
        actor,
      )
    : [];
  const withReplies = new Set(replies.map((r) => r.parentId));
  const visible = page.filter((p) => !p.deleted || withReplies.has(p.id));
  const last = page.at(-1);
  return {
    comments: [...visible, ...replies],
    nextCursor: hasMore && last ? `${last.createdAt}|${last.id}` : null,
  };
}

async function assertReportPublished(db: Database, reportId: string) {
  const [report] = await db.select({ status: priceReports.status }).from(priceReports).where(eq(priceReports.id, reportId));
  if (report?.status !== "published") throw new AppError("errors.notFound", 404);
}

export async function createComment(db: Database, raw: unknown, actor: Actor & { clientHash: string }) {
  const parsed = commentInputSchema.safeParse(raw);
  if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? "errors.invalidInput", 422, fieldErrors(parsed.error));
  const input = parsed.data;
  if (containsBlockedLanguage(input.body) || containsBlockedLanguage(input.displayName)) {
    throw new AppError("errors.inappropriate", 422, { body: "errors.inappropriate" });
  }
  await assertReportPublished(db, input.reportId);

  if (input.parentId) {
    const [parent] = await db
      .select({ reportId: comments.reportId, parentId: comments.parentId, status: comments.status })
      .from(comments)
      .where(eq(comments.id, input.parentId));
    if (!parent || parent.reportId !== input.reportId || parent.status !== "published") throw new AppError("errors.notFound", 404);
    if (parent.parentId) throw new AppError("errors.replyDepth", 422);
  }

  let upazilaId = input.upazilaId ?? null;
  if (input.districtId) {
    const [district] = await db.select({ level: locations.level }).from(locations).where(eq(locations.id, input.districtId));
    if (district?.level !== "district") throw new AppError("errors.locationInvalid", 422);
    if (upazilaId) {
      const [upazila] = await db.select({ parentId: locations.parentId }).from(locations).where(eq(locations.id, upazilaId));
      if (upazila?.parentId !== input.districtId) upazilaId = null;
    }
  } else {
    upazilaId = null;
  }

  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(comments)
      .values({
        reportId: input.reportId,
        parentId: input.parentId ?? null,
        authorId: actor.viewer?.id ?? null,
        authorHash: actor.clientHash,
        displayName: input.displayName ?? null,
        body: input.body ?? null,
        stickerId: input.stickerId ?? null,
        districtId: input.districtId ?? null,
        upazilaId,
        locality: input.districtId ? (input.locality ?? null) : null,
      })
      .returning({ id: comments.id });
    await tx
      .update(priceReports)
      .set({ commentCount: sql`${priceReports.commentCount} + 1` })
      .where(eq(priceReports.id, input.reportId));
    return row;
  });

  const [view] = await selectComments(db, and(eq(comments.id, created.id)), actor);
  return view;
}

async function loadOwnComment(db: Database, id: string, actor: Actor) {
  const [comment] = await db.select().from(comments).where(eq(comments.id, id));
  if (!comment) throw new AppError("errors.notFound", 404);
  const allowed = canModifyComment(
    { ownerHash: comment.authorHash, ownerId: comment.authorId, createdAt: comment.createdAt, status: comment.status, deletedAt: comment.deletedAt },
    actor,
  );
  if (!allowed) throw new AppError(comment.authorHash === actor.clientHash ? "errors.editWindowClosed" : "errors.forbidden", 403);
  return comment;
}

export async function editComment(db: Database, raw: unknown, actor: Actor) {
  const parsed = commentEditSchema.safeParse(raw);
  if (!parsed.success) throw new AppError(parsed.error.issues[0]?.message ?? "errors.invalidInput", 422);
  const { commentId, body, stickerId } = parsed.data;
  if (!body && !stickerId) throw new AppError("errors.commentEmpty", 422);
  if (containsBlockedLanguage(body)) throw new AppError("errors.inappropriate", 422);
  await loadOwnComment(db, commentId, actor);
  await db
    .update(comments)
    .set({ body: body ?? null, stickerId: stickerId ?? null, updatedAt: new Date() })
    .where(eq(comments.id, commentId));
  const [view] = await selectComments(db, and(eq(comments.id, commentId)), actor);
  return view;
}

/** Soft delete keeps the row for moderation history and reply threading. */
export async function deleteComment(db: Database, id: string, actor: Actor) {
  const comment = await loadOwnComment(db, id, actor);
  await db.transaction(async (tx) => {
    await tx.update(comments).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(comments.id, id));
    await tx
      .update(priceReports)
      .set({ commentCount: sql`greatest(${priceReports.commentCount} - 1, 0)` })
      .where(eq(priceReports.id, comment.reportId));
  });
}

export async function getReactions(db: Database, reportId: string, clientHash: string | null) {
  const rows = await db
    .select({
      stickerId: reportReactions.stickerId,
      count: sql<number>`count(*)::int`,
      mine: clientHash ? sql<boolean>`bool_or(${reportReactions.clientHash} = ${clientHash})` : sql<boolean>`false`,
    })
    .from(reportReactions)
    .where(eq(reportReactions.reportId, reportId))
    .groupBy(reportReactions.stickerId);
  return STICKER_IDS.map((id) => {
    const row = rows.find((r) => r.stickerId === id);
    return { stickerId: id, count: row?.count ?? 0, mine: row?.mine ?? false };
  });
}

/** Toggles one sticker reaction for this client on a report. */
export async function toggleReaction(db: Database, raw: unknown, clientHash: string) {
  const parsed = reactionInputSchema.safeParse(raw);
  if (!parsed.success) throw new AppError("errors.invalidSticker", 422);
  const { reportId, stickerId } = parsed.data;
  await assertReportPublished(db, reportId);
  const match = and(
    eq(reportReactions.reportId, reportId),
    eq(reportReactions.stickerId, stickerId),
    eq(reportReactions.clientHash, clientHash),
  );
  const removed = await db.delete(reportReactions).where(match).returning({ stickerId: reportReactions.stickerId });
  if (!removed.length) {
    await db.insert(reportReactions).values({ reportId, stickerId, clientHash }).onConflictDoNothing();
  }
  return getReactions(db, reportId, clientHash);
}

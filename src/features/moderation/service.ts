import { and, desc, eq, ilike, inArray, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  categories,
  comments,
  contentReports,
  locations,
  moderationActions,
  priceReports,
  profiles,
} from "@/db/schema";
import type { Database } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { escapeLike } from "@/lib/utils";
import { isAdmin, isStaff, type Viewer } from "@/features/auth/permissions";
import { UNIT_CODES } from "@/features/prices/units";
import { contentReportInputSchema } from "@/schemas/community";

function assertStaff(viewer: Viewer | null): asserts viewer is Viewer {
  if (!viewer) throw new AppError("errors.unauthorized", 401);
  if (!isStaff(viewer)) throw new AppError("errors.forbidden", 403);
}

function assertAdmin(viewer: Viewer | null): asserts viewer is Viewer {
  assertStaff(viewer);
  if (!isAdmin(viewer)) throw new AppError("errors.forbidden", 403);
}

// ---------------------------------------------------------------- public flags

export async function createContentReport(db: Database, raw: unknown, reporterHash: string) {
  const parsed = contentReportInputSchema.safeParse(raw);
  if (!parsed.success) throw new AppError("errors.invalidInput", 422);
  const input = parsed.data;
  const exists =
    input.targetType === "report"
      ? await db.select({ id: priceReports.id }).from(priceReports).where(and(eq(priceReports.id, input.targetId), eq(priceReports.status, "published")))
      : await db
          .select({ id: comments.id })
          .from(comments)
          .where(and(eq(comments.id, input.targetId), eq(comments.status, "published"), isNull(comments.deletedAt)));
  if (!exists.length) throw new AppError("errors.notFound", 404);

  const inserted = await db
    .insert(contentReports)
    .values({ ...input, details: input.details ?? null, reporterHash })
    .onConflictDoNothing()
    .returning({ id: contentReports.id });
  if (!inserted.length) throw new AppError("errors.alreadyReported", 409);
  return inserted[0];
}

// ---------------------------------------------------------------- moderation

export const REPORT_ACTIONS = ["approve", "reject", "hide", "restore", "clearFlags"] as const;
export type ReportAction = (typeof REPORT_ACTIONS)[number];

const REPORT_TRANSITIONS: Record<Exclude<ReportAction, "clearFlags">, { from: string[]; to: "published" | "rejected" | "hidden" }> = {
  approve: { from: ["pending"], to: "published" },
  reject: { from: ["pending"], to: "rejected" },
  hide: { from: ["published", "pending"], to: "hidden" },
  restore: { from: ["hidden", "rejected"], to: "published" },
};

async function logAction(
  db: Database,
  actor: Viewer,
  targetType: "report" | "comment" | "category" | "content_report" | "profile",
  targetId: string,
  action: string,
  note?: string | null,
  meta?: Record<string, unknown>,
) {
  await db.insert(moderationActions).values({ actorId: actor.id, targetType, targetId, action, note: note ?? null, meta: meta ?? null });
}

export async function moderateReport(db: Database, viewer: Viewer | null, reportId: string, action: ReportAction, note?: string | null) {
  assertStaff(viewer);
  if (!(REPORT_ACTIONS as readonly string[]).includes(action)) throw new AppError("errors.invalidInput", 422);
  const [report] = await db.select({ status: priceReports.status }).from(priceReports).where(eq(priceReports.id, reportId));
  if (!report) throw new AppError("errors.notFound", 404);

  await db.transaction(async (tx) => {
    if (action === "clearFlags") {
      await tx.update(priceReports).set({ flags: [], updatedAt: new Date() }).where(eq(priceReports.id, reportId));
    } else {
      const transition = REPORT_TRANSITIONS[action];
      if (!transition.from.includes(report.status)) throw new AppError("errors.invalidInput", 409);
      await tx.update(priceReports).set({ status: transition.to, updatedAt: new Date() }).where(eq(priceReports.id, reportId));
    }
    await logAction(tx as unknown as Database, viewer, "report", reportId, action, note, { from: report.status });
  });
}

export const COMMENT_ACTIONS = ["hide", "restore", "remove"] as const;
export type CommentAction = (typeof COMMENT_ACTIONS)[number];

export async function moderateComment(db: Database, viewer: Viewer | null, commentId: string, action: CommentAction, note?: string | null) {
  assertStaff(viewer);
  if (!(COMMENT_ACTIONS as readonly string[]).includes(action)) throw new AppError("errors.invalidInput", 422);
  const [comment] = await db.select({ status: comments.status, reportId: comments.reportId }).from(comments).where(eq(comments.id, commentId));
  if (!comment) throw new AppError("errors.notFound", 404);
  const to = action === "restore" ? "published" : action === "hide" ? "hidden" : "removed";
  await db.transaction(async (tx) => {
    await tx.update(comments).set({ status: to, updatedAt: new Date() }).where(eq(comments.id, commentId));
    const delta = comment.status === "published" && to !== "published" ? -1 : comment.status !== "published" && to === "published" ? 1 : 0;
    if (delta) {
      await tx
        .update(priceReports)
        .set({ commentCount: sql`greatest(${priceReports.commentCount} + ${delta}, 0)` })
        .where(eq(priceReports.id, comment.reportId));
    }
    await logAction(tx as unknown as Database, viewer, "comment", commentId, action, note, { from: comment.status });
  });
}

/** Resolve hides the flagged content; dismiss leaves it as is. */
export async function resolveContentReport(db: Database, viewer: Viewer | null, id: string, resolution: "resolve" | "dismiss", note?: string | null) {
  assertStaff(viewer);
  const [flag] = await db.select().from(contentReports).where(eq(contentReports.id, id));
  if (!flag) throw new AppError("errors.notFound", 404);
  if (flag.status !== "open") throw new AppError("errors.invalidInput", 409);

  if (resolution === "resolve") {
    if (flag.targetType === "report") {
      const [report] = await db.select({ status: priceReports.status }).from(priceReports).where(eq(priceReports.id, flag.targetId));
      if (report && report.status !== "hidden") await moderateReport(db, viewer, flag.targetId, "hide", note);
    } else {
      const [comment] = await db.select({ status: comments.status }).from(comments).where(eq(comments.id, flag.targetId));
      if (comment && comment.status === "published") await moderateComment(db, viewer, flag.targetId, "hide", note);
    }
  }
  // Close every open flag on the same target at once.
  await db
    .update(contentReports)
    .set({ status: resolution === "resolve" ? "resolved" : "dismissed", resolvedBy: viewer.id, resolvedAt: new Date() })
    .where(and(eq(contentReports.targetType, flag.targetType), eq(contentReports.targetId, flag.targetId), eq(contentReports.status, "open")));
  await logAction(db, viewer, "content_report", id, resolution, note, { targetType: flag.targetType, targetId: flag.targetId });
}

// ---------------------------------------------------------------- categories

export const categoryInputSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "errors.invalidInput").max(60),
  nameBn: z.string().trim().min(1, "errors.required").max(60),
  nameEn: z.string().trim().min(1, "errors.required").max(60),
  parentId: z.preprocess((v) => (v === "" || v == null ? null : v), z.uuid().nullable()),
  icon: z.string().trim().max(30).default("package"),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(100),
  isActive: z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean()),
  suggestedUnits: z.preprocess(
    (v) => (Array.isArray(v) ? v : typeof v === "string" && v ? [v] : []),
    z.array(z.enum(UNIT_CODES)),
  ),
});

export async function saveCategory(db: Database, viewer: Viewer | null, id: string | null, raw: unknown) {
  assertAdmin(viewer);
  const parsed = categoryInputSchema.safeParse(raw);
  if (!parsed.success) throw new AppError("errors.invalidInput", 422);
  const input = parsed.data;
  if (id && input.parentId === id) throw new AppError("errors.invalidInput", 422);
  if (input.parentId) {
    const [parent] = await db.select({ parentId: categories.parentId }).from(categories).where(eq(categories.id, input.parentId));
    // Keep the hierarchy two levels deep.
    if (!parent || parent.parentId) throw new AppError("errors.invalidInput", 422);
  }
  const [clash] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.slug, input.slug), id ? ne(categories.id, id) : undefined));
  if (clash) throw new AppError("admin.categories.slugTaken", 409);

  const values = { ...input, suggestedUnits: input.suggestedUnits.length ? input.suggestedUnits : null, updatedAt: new Date() };
  const [saved] = id
    ? await db.update(categories).set(values).where(eq(categories.id, id)).returning({ id: categories.id })
    : await db.insert(categories).values(values).returning({ id: categories.id });
  if (!saved) throw new AppError("errors.notFound", 404);
  await logAction(db, viewer, "category", saved.id, id ? "update" : "create", null, { slug: input.slug, isActive: input.isActive });
  return saved;
}

export async function setUserRole(db: Database, viewer: Viewer | null, userId: string, role: "user" | "moderator" | "admin") {
  assertAdmin(viewer);
  if (userId === viewer.id) throw new AppError("admin.settings.selfRole", 422);
  if (!["user", "moderator", "admin"].includes(role)) throw new AppError("errors.invalidInput", 422);
  const updated = await db.update(profiles).set({ role, updatedAt: new Date() }).where(eq(profiles.id, userId)).returning({ id: profiles.id });
  if (!updated.length) throw new AppError("errors.notFound", 404);
  await db.insert(moderationActions).values({ actorId: viewer.id, targetType: "profile", targetId: userId, action: `role:${role}` });
}

// ---------------------------------------------------------------- admin reads

export async function getDashboardStats(db: Database) {
  const real = eq(priceReports.isDemo, false);
  const [counts] = await db
    .select({
      published: sql<number>`count(*) filter (where ${priceReports.status} = 'published')::int`,
      pending: sql<number>`count(*) filter (where ${priceReports.status} = 'pending')::int`,
      recent: sql<number>`count(*) filter (where ${priceReports.createdAt} > now() - interval '24 hours')::int`,
      flagged: sql<number>`count(*) filter (where cardinality(${priceReports.flags}) > 0 and ${priceReports.status} in ('published','pending'))::int`,
    })
    .from(priceReports)
    .where(real);
  const [{ commentCount }] = await db.select({ commentCount: sql<number>`count(*)::int` }).from(comments).where(isNull(comments.deletedAt));
  const [{ openFlags }] = await db
    .select({ openFlags: sql<number>`count(*)::int` })
    .from(contentReports)
    .where(eq(contentReports.status, "open"));

  const byCategory = await db
    .select({
      nameBn: sql<string>`coalesce(p.name_bn, ${categories.nameBn})`,
      nameEn: sql<string>`coalesce(p.name_en, ${categories.nameEn})`,
      count: sql<number>`count(*)::int`,
    })
    .from(priceReports)
    .innerJoin(categories, eq(categories.id, priceReports.categoryId))
    .leftJoin(sql`${categories} p`, sql`p.id = ${categories.parentId}`)
    .where(and(real, eq(priceReports.status, "published")))
    .groupBy(sql`coalesce(p.name_bn, ${categories.nameBn})`, sql`coalesce(p.name_en, ${categories.nameEn})`)
    .orderBy(sql`count(*) desc`);

  const byDivision = await db
    .select({ nameBn: locations.nameBn, nameEn: locations.nameEn, count: sql<number>`count(*)::int` })
    .from(priceReports)
    .innerJoin(locations, eq(locations.id, priceReports.divisionId))
    .where(and(real, eq(priceReports.status, "published")))
    .groupBy(locations.nameBn, locations.nameEn)
    .orderBy(sql`count(*) desc`);

  const activity = await db
    .select({
      id: moderationActions.id,
      action: moderationActions.action,
      targetType: moderationActions.targetType,
      targetId: moderationActions.targetId,
      note: moderationActions.note,
      createdAt: moderationActions.createdAt,
      actorName: profiles.displayName,
    })
    .from(moderationActions)
    .leftJoin(profiles, eq(profiles.id, moderationActions.actorId))
    .orderBy(desc(moderationActions.createdAt))
    .limit(12);

  return { ...counts, commentCount, openFlags, byCategory, byDivision, activity };
}

export async function listAdminReports(
  db: Database,
  params: { status?: string; flagged?: boolean; q?: string; page: number },
  pageSize = 25,
) {
  const conditions: SQL[] = [];
  if (params.status && ["pending", "published", "rejected", "hidden"].includes(params.status)) {
    conditions.push(eq(priceReports.status, params.status as "pending"));
  }
  if (params.flagged) conditions.push(sql`cardinality(${priceReports.flags}) > 0`);
  if (params.q) {
    const p = `%${escapeLike(params.q)}%`;
    conditions.push(or(ilike(priceReports.productName, p), ilike(priceReports.marketName, p), ilike(priceReports.displayName, p))!);
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const openFlags = sql<number>`(select count(*)::int from ${contentReports} cr where cr.target_type = 'report' and cr.target_id = ${priceReports.id} and cr.status = 'open')`;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: priceReports.id,
        productName: priceReports.productName,
        price: sql<number>`${priceReports.price}`.mapWith(Number),
        quantity: sql<number>`${priceReports.quantity}`.mapWith(Number),
        unit: priceReports.unit,
        status: priceReports.status,
        flags: priceReports.flags,
        isDemo: priceReports.isDemo,
        note: priceReports.note,
        displayName: priceReports.displayName,
        createdAt: priceReports.createdAt,
        districtBn: locations.nameBn,
        districtEn: locations.nameEn,
        openFlags,
      })
      .from(priceReports)
      .innerJoin(locations, eq(locations.id, priceReports.districtId))
      .where(where)
      .orderBy(desc(priceReports.createdAt))
      .limit(pageSize)
      .offset((params.page - 1) * pageSize),
    db.select({ total: sql<number>`count(*)::int` }).from(priceReports).where(where),
  ]);
  return { rows, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listAdminComments(db: Database, params: { status?: string; flagged?: boolean; page: number }, pageSize = 25) {
  const conditions: SQL[] = [];
  if (params.status && ["published", "hidden", "removed"].includes(params.status)) conditions.push(eq(comments.status, params.status as "published"));
  const openFlags = sql<number>`(select count(*)::int from ${contentReports} cr where cr.target_type = 'comment' and cr.target_id = ${comments.id} and cr.status = 'open')`;
  if (params.flagged) conditions.push(sql`${openFlags} > 0`);
  const where = conditions.length ? and(...conditions) : undefined;
  const sameAuthor = sql<number>`(select count(*)::int - 1 from ${comments} c2 where c2.author_hash = ${comments.authorHash})`;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: comments.id,
        reportId: comments.reportId,
        body: comments.body,
        stickerId: comments.stickerId,
        displayName: comments.displayName,
        status: comments.status,
        deletedAt: comments.deletedAt,
        createdAt: comments.createdAt,
        productName: priceReports.productName,
        openFlags,
        sameAuthor,
      })
      .from(comments)
      .innerJoin(priceReports, eq(priceReports.id, comments.reportId))
      .where(where)
      .orderBy(desc(comments.createdAt))
      .limit(pageSize)
      .offset((params.page - 1) * pageSize),
    db.select({ total: sql<number>`count(*)::int` }).from(comments).where(where),
  ]);
  return { rows, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listContentReports(db: Database, status: "open" | "resolved" | "dismissed" = "open") {
  const flags = await db
    .select()
    .from(contentReports)
    .where(eq(contentReports.status, status))
    .orderBy(desc(contentReports.createdAt))
    .limit(100);
  const reportIds = flags.filter((f) => f.targetType === "report").map((f) => f.targetId);
  const commentIds = flags.filter((f) => f.targetType === "comment").map((f) => f.targetId);
  const [reportRows, commentRows] = await Promise.all([
    reportIds.length
      ? db
          .select({ id: priceReports.id, productName: priceReports.productName, price: priceReports.price, unit: priceReports.unit, status: priceReports.status })
          .from(priceReports)
          .where(inArray(priceReports.id, reportIds))
      : [],
    commentIds.length
      ? db
          .select({ id: comments.id, body: comments.body, stickerId: comments.stickerId, status: comments.status, reportId: comments.reportId })
          .from(comments)
          .where(inArray(comments.id, commentIds))
      : [],
  ]);
  return flags.map((f) => ({
    ...f,
    report: f.targetType === "report" ? (reportRows.find((r) => r.id === f.targetId) ?? null) : null,
    comment: f.targetType === "comment" ? (commentRows.find((c) => c.id === f.targetId) ?? null) : null,
  }));
}

export async function listProfiles(db: Database) {
  return db.select().from(profiles).orderBy(desc(profiles.createdAt)).limit(200);
}

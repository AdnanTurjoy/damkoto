export type Role = "user" | "moderator" | "admin";

export interface Viewer {
  id: string;
  role: Role;
  displayName: string | null;
}

export const REPORT_EDIT_WINDOW_HOURS = 48;
export const COMMENT_EDIT_WINDOW_HOURS = 24;

export function isStaff(viewer: Pick<Viewer, "role"> | null | undefined): boolean {
  return viewer?.role === "moderator" || viewer?.role === "admin";
}

export function isAdmin(viewer: Pick<Viewer, "role"> | null | undefined): boolean {
  return viewer?.role === "admin";
}

interface Owned {
  ownerHash: string;
  ownerId: string | null;
  createdAt: Date;
}

export interface Actor {
  clientHash: string | null;
  viewer: Viewer | null;
}

export function isOwner(item: Pick<Owned, "ownerHash" | "ownerId">, actor: Actor): boolean {
  if (actor.viewer && item.ownerId && item.ownerId === actor.viewer.id) return true;
  return Boolean(actor.clientHash && item.ownerHash === actor.clientHash);
}

function withinHours(createdAt: Date, hours: number, now: Date) {
  return now.getTime() - createdAt.getTime() <= hours * 3_600_000;
}

/** Owners may edit/delete their own pending or published report within 48 hours. */
export function canModifyReport(
  report: Owned & { status: string },
  actor: Actor,
  now = new Date(),
): boolean {
  if (!isOwner(report, actor)) return false;
  if (report.status !== "published" && report.status !== "pending") return false;
  return withinHours(report.createdAt, REPORT_EDIT_WINDOW_HOURS, now);
}

/** Owners may edit/delete their own published comment within 24 hours. */
export function canModifyComment(
  comment: Owned & { status: string; deletedAt: Date | null },
  actor: Actor,
  now = new Date(),
): boolean {
  if (comment.deletedAt || comment.status !== "published") return false;
  if (!isOwner(comment, actor)) return false;
  return withinHours(comment.createdAt, COMMENT_EDIT_WINDOW_HOURS, now);
}

import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { comments, priceReports } from "@/db/schema";
import type { Actor } from "@/features/auth/permissions";
import type { Database } from "@/lib/db/client";
import { getReportSummaries } from "./queries";

/** Everything this browser (or signed-in user) has contributed, in any status. */
export async function getMyContributions(db: Database, actor: Actor) {
  const ownsReport = or(
    actor.clientHash ? eq(priceReports.submitterHash, actor.clientHash) : undefined,
    actor.viewer ? eq(priceReports.contributorId, actor.viewer.id) : undefined,
  );
  const ownsComment = or(
    actor.clientHash ? eq(comments.authorHash, actor.clientHash) : undefined,
    actor.viewer ? eq(comments.authorId, actor.viewer.id) : undefined,
  );
  if (!ownsReport || !ownsComment) return { reports: [], comments: [], districts: 0 };

  const [reports, myComments, [{ districts }]] = await Promise.all([
    getReportSummaries(db, ownsReport, 100, [desc(priceReports.createdAt)]),
    db
      .select({ id: comments.id, body: comments.body, stickerId: comments.stickerId, createdAt: comments.createdAt, status: comments.status, reportId: comments.reportId, productName: priceReports.productName })
      .from(comments)
      .innerJoin(priceReports, eq(priceReports.id, comments.reportId))
      .where(and(ownsComment, isNull(comments.deletedAt)))
      .orderBy(desc(comments.createdAt))
      .limit(100),
    db.select({ districts: sql<number>`count(distinct ${priceReports.districtId})::int` }).from(priceReports).where(ownsReport),
  ]);
  return { reports, comments: myComments, districts };
}

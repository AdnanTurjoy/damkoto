import { lt, sql } from "drizzle-orm";
import { rateLimits } from "@/db/schema";
import type { Database } from "@/lib/db/client";

export interface RateLimitRule {
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMITS = {
  reportPerClient: { limit: 10, windowSeconds: 3600 },
  reportPerIp: { limit: 30, windowSeconds: 3600 },
  commentPerClient: { limit: 15, windowSeconds: 600 },
  commentPerIp: { limit: 40, windowSeconds: 600 },
  stickerPerClient: { limit: 30, windowSeconds: 600 },
  flagPerClient: { limit: 20, windowSeconds: 3600 },
  uploadPerClient: { limit: 15, windowSeconds: 3600 },
  loginPerIp: { limit: 10, windowSeconds: 900 },
} satisfies Record<string, RateLimitRule>;

/**
 * Fixed-window counter stored in Postgres. A single atomic upsert works
 * across serverless instances, unlike an in-memory limiter. Returns true
 * when the action is allowed.
 */
export async function consumeRateLimit(db: Database, key: string, rule: RateLimitRule): Promise<boolean> {
  const window = sql.raw(`interval '${Math.floor(rule.windowSeconds)} seconds'`);
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart: new Date(), count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.windowStart} < now() - ${window} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${rateLimits.windowStart} < now() - ${window} then now() else ${rateLimits.windowStart} end`,
      },
    })
    .returning({ count: rateLimits.count });

  // Opportunistic cleanup keeps the table small without a cron job.
  if (Math.random() < 0.01) {
    await db.delete(rateLimits).where(lt(rateLimits.windowStart, sql`now() - interval '1 day'`));
  }
  return row.count <= rule.limit;
}

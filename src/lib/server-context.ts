import "server-only";
import { env } from "@/config/env";
import type { Actor } from "@/features/auth/permissions";
import { getViewer } from "@/lib/auth/session";
import type { QueryOptions } from "@/features/prices/queries";
import { getClientHash } from "@/lib/identity";

export function queryOptions(): QueryOptions {
  return { showDemo: env.showDemoData };
}

/** Identity for read-side ownership checks (no cookie is created). */
export async function getActor(): Promise<Actor> {
  const [clientHash, viewer] = await Promise.all([getClientHash(), getViewer()]);
  return { clientHash, viewer };
}

/** Identity for mutations; issues a client cookie when missing. */
export async function getWriteActor(): Promise<Actor & { clientHash: string }> {
  const [clientHash, viewer] = await Promise.all([getClientHash({ create: true }), getViewer()]);
  return { clientHash: clientHash!, viewer };
}

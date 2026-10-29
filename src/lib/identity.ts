import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { requireSessionSecret } from "@/config/env";

const CLIENT_COOKIE = "dk_cid";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function hmac(value: string, purpose: string): string {
  return createHmac("sha256", requireSessionSecret()).update(`${purpose}:${value}`).digest("hex").slice(0, 40);
}

/**
 * Returns a keyed hash of the anonymous client cookie. Raw ids are never
 * stored. Pass `create` from Server Actions / Route Handlers to issue a
 * cookie when the proxy has not already done so.
 */
export async function getClientHash(options: { create?: boolean } = {}): Promise<string | null> {
  const store = await cookies();
  let id = store.get(CLIENT_COOKIE)?.value;
  if (!id || !UUID_RE.test(id)) {
    if (!options.create) return null;
    id = randomUUID();
    store.set(CLIENT_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365 * 2,
    });
  }
  return hmac(id, "client");
}

/** Keyed hash of the requester's IP, used only for rate-limit keys. */
export async function getIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return hmac(ip, "ip");
}

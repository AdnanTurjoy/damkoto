import "server-only";
import { NextResponse } from "next/server";
import { isDatabaseUnavailable } from "@/lib/db/client";
import { AppError } from "@/lib/errors";

/** Consistent JSON envelope: { ok: true, data } | { ok: false, error }. */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(error: string, status: number, fields?: Record<string, string>) {
  return NextResponse.json({ ok: false, error, ...(fields ? { fields } : {}) }, { status });
}

export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AppError) return fail(error.code, error.status, error.fields);
    if (isDatabaseUnavailable(error)) return fail("errors.serviceTitle", 503);
    console.error(error);
    return fail("errors.server", 500);
  }
}

/** Rejects cross-site POSTs to route handlers (Server Actions check this natively). */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) throw new AppError("errors.forbidden", 403);
}

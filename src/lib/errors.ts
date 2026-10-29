/** Errors whose `code` is a translation key safe to show to users. */
export class AppError extends Error {
  constructor(
    public code: string,
    public status = 400,
    public fields?: Record<string, string>,
  ) {
    super(code);
    this.name = "AppError";
  }
}

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; fields?: Record<string, string> };

/** Converts thrown errors into a serialisable result without leaking internals. */
export function toActionError(error: unknown): { ok: false; error: string; fields?: Record<string, string> } {
  if (error instanceof AppError) return { ok: false, error: error.code, fields: error.fields };
  console.error(error);
  return { ok: false, error: "errors.server" };
}

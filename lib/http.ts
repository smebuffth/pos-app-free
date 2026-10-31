import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const ok = <T>(data: T, init?: ResponseInit) => Response.json({ ok: true, data }, init);

export const fail = (status: number, code: string, message: string) =>
  Response.json({ ok: false, error: { code, message } }, { status });

// Route handlers wrap their body in handle(). It maps errors to the envelope.
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    // Next.js signals a dynamic route (connection(), cookies()) with an error that has a digest. Pass it on, or the
    // route would be treated as a failed request instead of a dynamic one.
    if (typeof (err as { digest?: unknown })?.digest === "string") throw err;
    if (err instanceof HttpError) return fail(err.status, err.code, err.message);
    if (err instanceof ZodError) return fail(400, "validation_error", "ข้อมูลไม่ถูกต้อง");
    const code = (err as { code?: string }).code;
    // Postgres SQLSTATE: unique violation and CHECK violation map to 409. Log the code only, never the values.
    if (code === "23505") return fail(409, "conflict", "ข้อมูลนี้มีอยู่แล้ว");
    if (code === "23514") return fail(409, "constraint", "ไม่สามารถดำเนินการได้");
    console.error("route error", code ?? "unknown");
    return fail(500, "internal", "เกิดข้อผิดพลาดภายในระบบ");
  }
}

// Server Actions return this. Forms read `error` for the message and `data` on success.
export type Result<T = void> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

export const good = <T>(data: T): Result<T> => ({ ok: true, data });
export const bad = (code: string, message: string): Result<never> => ({ ok: false, error: { code, message } });

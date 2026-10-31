"use server";

import { z } from "zod";
import { tx, withDb } from "@/lib/db";
import { audit } from "@/lib/audit";
import { bad, good, type Result } from "@/lib/http";
import { requireUser } from "@/lib/auth/guards";
import { MCP_ROLES, TTL_CHOICES_DAYS, createMcpToken, revokeMcpToken } from "@/lib/mcp/tokens";

export type CreatedToken = { token: string; expiresAt: string };

// The raw token is returned to the page once. It is never logged and never stored.
export async function createMcpTokenAction(_prev: Result<CreatedToken> | undefined, formData: FormData): Promise<Result<CreatedToken>> {
  const user = await requireUser();
  if (!(MCP_ROLES as readonly string[]).includes(user.role)) return bad("forbidden", "บัญชีนี้สร้างโทเคนไม่ได้");
  const parsed = z
    .object({ name: z.string().trim().min(1, "ตั้งชื่อโทเคน").max(60), ttlDays: z.union([z.literal(7), z.literal(30), z.literal(90)]) })
    .safeParse({ name: String(formData.get("name") ?? ""), ttlDays: Number(formData.get("ttlDays") ?? 30) });
  if (!parsed.success) return bad("validation_error", parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
  const ttl = TTL_CHOICES_DAYS.find((d) => d === parsed.data.ttlDays);
  if (!ttl) return bad("validation_error", "เลือกอายุโทเคนให้ถูกต้อง");

  const result = await withDb((db) =>
    tx(db, async () => {
      const created = await createMcpToken(db, user, { name: parsed.data.name, ttlDays: ttl });
      if (created.ok) await audit(db, user.id, "mcp.token_create", "mcp_token", created.data.id, { ttlDays: ttl });
      return created;
    }),
  );
  if (!result.ok) return bad(result.error.code, result.error.message);
  return good({ token: result.data.token, expiresAt: result.data.expiresAt.toISOString() });
}

export async function revokeMcpTokenAction(_prev: Result<null> | undefined, formData: FormData): Promise<Result<null>> {
  const user = await requireUser();
  const id = z.string().min(1).max(64).safeParse(String(formData.get("tokenId") ?? ""));
  if (!id.success) return bad("validation_error", "ไม่พบโทเคนนี้");
  const revoked = await withDb((db) =>
    tx(db, async () => {
      const ok = await revokeMcpToken(db, user.id, id.data);
      if (ok) await audit(db, user.id, "mcp.token_revoke", "mcp_token", id.data);
      return ok;
    }),
  );
  if (!revoked) return bad("not_found", "ไม่พบโทเคนนี้");
  return good(null);
}

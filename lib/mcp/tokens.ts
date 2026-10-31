// lib/mcp/tokens.ts: MCP access tokens for the POS. A token is "mcp_" + 64 hex characters (32 random bytes).
// The database keeps only its SHA-256, so a database leak does not leak live tokens. The raw token is shown to its
// owner once, in the response that creates it.
import { sha256Hex, toHex } from "@/lib/crypto";
import type { Db } from "@/lib/db";

export const MCP_TOKEN_PREFIX = "mcp_";
export const MCP_TOKEN_LENGTH = MCP_TOKEN_PREFIX.length + 64;

// Read only. The POS endpoint has no write tools in this version, so the only scope is "read".
export const MCP_SCOPES = ["read"] as const;
export type McpScope = (typeof MCP_SCOPES)[number];

export const MAX_ACTIVE_TOKENS = 5;
export const TTL_CHOICES_DAYS = [7, 30, 90] as const;

export const hashToken = (token: string) => sha256Hex(token);

// JSON columns come back parsed on PostgreSQL, and as a string on some drivers.
export const asArray = (value: unknown): string[] =>
  Array.isArray(value) ? (value as string[]) : typeof value === "string" ? (JSON.parse(value) as string[]) : [];

// Only the owner and managers have a token: a cashier cannot read the store's sales through MCP.
export const MCP_ROLES = ["owner", "manager"] as const;

export type McpTokenRow = {
  id: string;
  name: string;
  hint: string;
  expiresAt: Date;
  lastUsedAt: Date | null;
  createdAt: Date;
};

export type CreateTokenResult =
  | { ok: true; data: { id: string; token: string; expiresAt: Date } }
  | { ok: false; error: { code: string; message: string } };

export async function createMcpToken(
  db: Db,
  user: { id: string; role: string },
  input: { name: string; ttlDays: (typeof TTL_CHOICES_DAYS)[number] },
): Promise<CreateTokenResult> {
  if (!(MCP_ROLES as readonly string[]).includes(user.role)) {
    return { ok: false, error: { code: "forbidden", message: "บัญชีนี้สร้างโทเคนไม่ได้" } };
  }
  const now = new Date();
  const active = await db.query<{ n: number | string }>(
    "SELECT COUNT(*) AS n FROM mcp_tokens WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > $2",
    [user.id, now],
  );
  if (Number(active.rows[0].n) >= MAX_ACTIVE_TOKENS) {
    return { ok: false, error: { code: "too_many_tokens", message: "มีโทเคนที่ใช้งานอยู่ครบจำนวนสูงสุดแล้ว ยกเลิกอันที่ไม่ใช้ก่อน" } };
  }
  const token = MCP_TOKEN_PREFIX + toHex(crypto.getRandomValues(new Uint8Array(32)));
  const id = crypto.randomUUID();
  const expiresAt = new Date(now.getTime() + input.ttlDays * 86_400_000);
  await db.query(
    `INSERT INTO mcp_tokens (id, user_id, name, token_hash, token_hint, scopes, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, user.id, input.name, await hashToken(token), token.slice(-4), JSON.stringify(["read"]), expiresAt, now],
  );
  return { ok: true, data: { id, token, expiresAt } };
}

export async function listMcpTokens(db: Db, userId: string): Promise<McpTokenRow[]> {
  const { rows } = await db.query<{ id: string; name: string; token_hint: string; expires_at: Date; last_used_at: Date | null; created_at: Date }>(
    `SELECT id, name, token_hint, expires_at, last_used_at, created_at
       FROM mcp_tokens WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > $2
      ORDER BY created_at DESC`,
    [userId, new Date()],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    hint: r.token_hint,
    expiresAt: new Date(r.expires_at),
    lastUsedAt: r.last_used_at ? new Date(r.last_used_at) : null,
    createdAt: new Date(r.created_at),
  }));
}

// Only the owner of a token can revoke it. Someone else's token id changes nothing.
export async function revokeMcpToken(db: Db, userId: string, tokenId: string): Promise<boolean> {
  const res = await db.query("UPDATE mcp_tokens SET revoked_at = $1 WHERE id = $2 AND user_id = $3 AND revoked_at IS NULL", [
    new Date(),
    tokenId,
    userId,
  ]);
  return (res.rowCount ?? 0) === 1;
}

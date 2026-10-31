import { getCloudflareContext } from "@opennextjs/cloudflare";
import { connection } from "next/server";
import { withDb } from "@/lib/db";
import { handle, HttpError, ok } from "@/lib/http";

// Called once a day by the Worker's cron trigger (worker.ts). It calls this route through the self binding.
// Removes expired sessions, stale login-rate rows, and old MCP audit rows and tokens.
async function cronSecret(): Promise<string | undefined> {
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET;
  const { env } = await getCloudflareContext({ async: true });
  return (env as { CRON_SECRET?: string }).CRON_SECRET;
}

function sameSecret(given: string, expected: string) {
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: Request) {
  return handle(async () => {
    await connection();
    const expected = await cronSecret();
    const header = request.headers.get("authorization") ?? "";
    if (!expected || !header.startsWith("Bearer ") || !sameSecret(header.slice(7), expected)) {
      throw new HttpError(401, "unauthenticated", "กรุณาเข้าสู่ระบบ");
    }
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 86_400_000);
    const result = await withDb(async (db) => {
      const sessions = await db.query("DELETE FROM sessions WHERE expires_at < $1", [now]);
      const attempts = await db.query("DELETE FROM login_attempts WHERE window_start < $1", [dayAgo]);
      // MCP: audit rows older than 30 days; tokens expired or revoked more than 30 days ago.
      const monthAgo = new Date(now.getTime() - 30 * 86_400_000);
      const audits = await db.query("DELETE FROM mcp_audit WHERE created_at < $1", [monthAgo]);
      const tokens = await db.query("DELETE FROM mcp_tokens WHERE expires_at < $1 OR revoked_at < $1", [monthAgo]);
      return {
        sessionsRemoved: sessions.rowCount ?? 0,
        attemptsRemoved: attempts.rowCount ?? 0,
        auditRemoved: audits.rowCount ?? 0,
        tokensRemoved: tokens.rowCount ?? 0,
      };
    });
    return ok(result);
  });
}

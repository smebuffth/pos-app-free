import { cookies } from "next/headers";
import type { Db } from "@/lib/db";
import { sha256Hex, toHex } from "@/lib/crypto";
import { SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth/constants";

export type Role = "owner" | "manager" | "cashier";
export type AuthUser = { id: string; email: string; name: string; role: Role };

export async function createSession(db: Db, userId: string): Promise<void> {
  const jar = await cookies();
  const previous = jar.get(SESSION_COOKIE)?.value;
  if (previous) await db.query("DELETE FROM sessions WHERE token_hash = $1", [await sha256Hex(previous)]);
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.query("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [
    await sha256Hex(token),
    userId,
    expiresAt,
  ]);
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

// Signs out every other device of this user. Used after a password change.
export async function revokeOtherSessions(db: Db, userId: string): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const keep = token ? await sha256Hex(token) : "";
  await db.query("DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2", [userId, keep]);
}

export async function readSessionUser(db: Db): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const { rows } = await db.query<AuthUser & { active: number }>(
    `SELECT u.id, u.email, u.name, u.role, u.active
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > $2`,
    [await sha256Hex(token), new Date()], // timestamps are passed as JS Dates (database.md, portable SQL)
  );
  const row = rows[0];
  if (!row || row.active !== 1) return null;
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

export async function destroySession(db: Db): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.query("DELETE FROM sessions WHERE token_hash = $1", [await sha256Hex(token)]);
  jar.delete(SESSION_COOKIE);
}

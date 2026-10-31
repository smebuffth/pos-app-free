import type { Db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db";

// Five failed sign-ins in 15 minutes lock the key. A success clears it.
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function isLimited(db: Db, keys: string[]): Promise<boolean> {
  const now = Date.now();
  for (const key of keys) {
    const { rows } = await db.query<{ failures: number; window_start: Date }>(
      "SELECT failures, window_start FROM login_attempts WHERE rate_key = $1",
      [key],
    );
    const row = rows[0];
    if (row && now - new Date(row.window_start).getTime() < WINDOW_MS && row.failures >= MAX_FAILURES) return true;
  }
  return false;
}

export async function recordFailure(db: Db, keys: string[]): Promise<void> {
  const now = Date.now();
  for (const key of keys) {
    const { rows } = await db.query<{ failures: number; window_start: Date }>(
      "SELECT failures, window_start FROM login_attempts WHERE rate_key = $1",
      [key],
    );
    const row = rows[0];
    const fresh = row && now - new Date(row.window_start).getTime() < WINDOW_MS;
    if (row && fresh) {
      await db.query("UPDATE login_attempts SET failures = failures + 1 WHERE rate_key = $1", [key]);
    } else if (row) {
      await db.query("UPDATE login_attempts SET failures = 1, window_start = $2 WHERE rate_key = $1", [key, new Date(now)]);
    } else {
      try {
        await db.query("INSERT INTO login_attempts (rate_key, failures, window_start) VALUES ($1, 1, $2)", [key, new Date(now)]);
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        await db.query("UPDATE login_attempts SET failures = failures + 1 WHERE rate_key = $1", [key]);
      }
    }
  }
}

export async function clearFailures(db: Db, keys: string[]): Promise<void> {
  for (const key of keys) await db.query("DELETE FROM login_attempts WHERE rate_key = $1", [key]);
}

// A plain hourly quota (for example, AI calls): at most `max` hits per `windowMs`. Returns false once the quota is spent.
export async function takeQuota(db: Db, key: string, max: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const { rows } = await db.query<{ failures: number; window_start: Date }>(
    "SELECT failures, window_start FROM login_attempts WHERE rate_key = $1",
    [key],
  );
  const row = rows[0];
  if (!row || now - new Date(row.window_start).getTime() >= windowMs) {
    if (row) {
      await db.query("UPDATE login_attempts SET failures = 1, window_start = $2 WHERE rate_key = $1", [key, new Date(now)]);
    } else {
      try {
        await db.query("INSERT INTO login_attempts (rate_key, failures, window_start) VALUES ($1, 1, $2)", [key, new Date(now)]);
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        return false;
      }
    }
    return true;
  }
  if (row.failures >= max) return false;
  await db.query("UPDATE login_attempts SET failures = failures + 1 WHERE rate_key = $1", [key]);
  return true;
}

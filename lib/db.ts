// lib/db.ts for PostgreSQL: a local container, Supabase, Neon, or any other PostgreSQL.
// Copy to lib/db.ts. The MySQL engine uses db.mysql.ts, which exports the same names.
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { connection } from "next/server";
import { Client, types } from "pg";

// DATE columns (policy start and end) come back as "YYYY-MM-DD" strings, the same as on MySQL.
types.setTypeParser(types.builtins.DATE, (value) => value);

export type Row = Record<string, unknown>;
export type Db = {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
};

// SQLSTATE 23505 unique violation, 23514 CHECK violation.
const code = (e: unknown) => (e as { code?: string } | null)?.code;
export const isUniqueViolation = (e: unknown) => code(e) === "23505";
export const isCheckViolation = (e: unknown) => code(e) === "23514";

// "$3, $4, $5" for an IN list. ANY($1) is PostgreSQL-only, so IN lists use this on every engine.
export const placeholders = (count: number, from = 1) =>
  Array.from({ length: count }, (_, i) => `$${from + i}`).join(", ");

// next dev reads .env.local into process.env. In the Worker, a Hyperdrive binding wins over a DATABASE_URL secret.
async function databaseUrl(): Promise<string> {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const { env } = await getCloudflareContext({ async: true });
  const hyperdrive = (env as { HYPERDRIVE?: Hyperdrive }).HYPERDRIVE;
  const url = hyperdrive?.connectionString ?? (env as { DATABASE_URL?: string }).DATABASE_URL;
  if (!url) throw new Error("No database: set DATABASE_URL, or bind HYPERDRIVE in wrangler.jsonc");
  return url;
}

// Runs fn with one connection for this request. Call it once per request and pass `db` down.
export async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  await connection(); // database reads are per-request; never prerendered
  const client = new Client({ connectionString: await databaseUrl() });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

// Runs fn inside BEGIN / COMMIT on one connection. A throw rolls back everything.
export async function tx<T>(db: Db, fn: () => Promise<T>): Promise<T> {
  await db.query("BEGIN");
  try {
    const result = await fn();
    await db.query("COMMIT");
    return result;
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  }
}

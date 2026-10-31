// Applies migrations/*.sql in name order. Each file runs once and is recorded in schema_migrations.
// Works for PostgreSQL (local, Supabase, Neon, other) and MySQL 8; the engine comes from the URL scheme
// (postgres:// or postgresql:// -> pg, mysql:// -> mysql2). Run from the project root:
//   node --env-file=.dev.vars scripts/migrate.mjs                    apply new migrations
//   node --env-file=.dev.vars scripts/migrate.mjs --run seed/seed.sql  run one SQL file, once, without recording it
// PostgreSQL runs each file in one transaction. MySQL cannot roll back DDL, so a file that fails halfway
// leaves its earlier statements applied: fix the file, drop what it created, and run again.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. Run with --env-file=.dev.vars");
const scheme = url.split(":")[0];
const runIndex = process.argv.indexOf("--run");
const runFile = runIndex > -1 ? process.argv[runIndex + 1] : null;
if (runIndex > -1 && !runFile) throw new Error("--run needs a file, e.g. --run seed/seed.sql");
const files = runFile ? [] : readdirSync("migrations").filter((f) => f.endsWith(".sql")).sort();

if (scheme === "postgres" || scheme === "postgresql") {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    if (runFile) {
      await client.query("BEGIN");
      try {
        await client.query(readFileSync(runFile, "utf8"));
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
      console.log(`ran ${runFile}`);
      process.exit(0);
    }
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    const { rows } = await client.query("SELECT name FROM schema_migrations");
    const applied = new Set(rows.map((r) => r.name));
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(join("migrations", file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`applied ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
  } finally {
    await client.end();
  }
} else if (scheme === "mysql") {
  const { createConnection } = await import("mysql2/promise");
  const conn = await createConnection({ uri: url, multipleStatements: true, timezone: "Z" });
  try {
    if (runFile) {
      await conn.query(readFileSync(runFile, "utf8"));
      console.log(`ran ${runFile}`);
      process.exit(0);
    }
    await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name       VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at DATETIME(3)  NOT NULL DEFAULT (UTC_TIMESTAMP(3))
    )`);
    const [rows] = await conn.query("SELECT name FROM schema_migrations");
    const applied = new Set(rows.map((r) => r.name));
    for (const file of files) {
      if (applied.has(file)) continue;
      await conn.query(readFileSync(join("migrations", file), "utf8"));
      await conn.query("INSERT INTO schema_migrations (name) VALUES (?)", [file]);
      console.log(`applied ${file}`);
    }
  } finally {
    await conn.end();
  }
} else {
  throw new Error(`Unsupported DATABASE_URL scheme "${scheme}". Use postgres://, postgresql:// or mysql://`);
}
console.log("migrations up to date");

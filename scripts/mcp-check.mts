// Checks the POS MCP tools through the SDK's own request handler, with no server running. Scratch database only.
//   DATABASE_URL=<scratch url> npx tsx scripts/mcp-check.mts
import { Client } from "pg";
import { createMcpHandler, LATEST_PROTOCOL_VERSION } from "@modelcontextprotocol/server";
import { buildMcpServer } from "@/lib/mcp/server";
import { createMcpToken } from "@/lib/mcp/tokens";
import type { Db } from "@/lib/db";

const url = process.env.DATABASE_URL ?? "";
if (!(url.split("?")[0].split("/").pop() ?? "").includes("_test")) {
  console.error("refused: DATABASE_URL must point to a database whose name contains _test");
  process.exit(2);
}

const client = new Client({ connectionString: url });
await client.connect();
const rawDb: Db = {
  query: async (sql, params) => {
    const r = await client.query(sql, params as unknown[]);
    return { rows: r.rows, rowCount: r.rowCount };
  },
};

const results: { name: string; ok: boolean }[] = [];
const check = (name: string, ok: boolean) => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
};

await client.query("DELETE FROM users WHERE id LIKE 'mcp-%'");
const seed = async (id: string, role: string) =>
  client.query("INSERT INTO users (id, email, name, password_hash, role, active) VALUES ($1, $2, $3, 'x', $4, 1)", [id, `${id}@test.local`, id, role]);
await seed("mcp-manager", "manager");
await seed("mcp-cashier", "cashier");

async function rpc(userId: string, role: string, body: object): Promise<unknown> {
  const authInfo = { token: "redacted", clientId: `tok-${userId}`, scopes: ["read"], expiresAt: 0, extra: { userId, role } };
  const res = await createMcpHandler(({ authInfo: info }) => buildMcpServer(rawDb, info, { ratePerMinute: 60 })).fetch(
    new Request("https://pos.test/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": LATEST_PROTOCOL_VERSION },
      body: JSON.stringify(body),
    }),
    { authInfo },
  );
  const text = await res.text();
  const data = text.includes("data:") ? text.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("") : text;
  return JSON.parse(data || "{}");
}

const managerTools = (await rpc("mcp-manager", "manager", { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} })) as { result?: { tools?: { name: string }[] } };
const names = (managerTools.result?.tools ?? []).map((t) => t.name);
check("a manager sees the read tools", ["get_profile", "search_products", "sales_summary", "list_sales", "shift_status"].every((n) => names.includes(n)));
check("no tool in this version can write", names.every((n) => !/create|add|set|void|adjust|update|delete|receive|open|close/.test(n)));
const cashierTools = (await rpc("mcp-cashier", "cashier", { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })) as { result?: { tools?: unknown[] } };
check("a cashier sees no tools", (cashierTools.result?.tools ?? []).length === 0);

const profile = (await rpc("mcp-manager", "manager", { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_profile", arguments: {} } })) as { result?: { content?: { text: string }[] } };
const body = JSON.parse(profile.result?.content?.[0]?.text ?? "{}") as { ok?: boolean; data?: { role?: string; password_hash?: string } };
check("get_profile returns the caller and never a password hash", body.ok === true && body.data?.role === "manager" && body.data?.password_hash === undefined);

const summary = (await rpc("mcp-manager", "manager", {
  jsonrpc: "2.0",
  id: 4,
  method: "tools/call",
  params: { name: "sales_summary", arguments: { from: "2020-01-01", to: "2020-01-02" } },
})) as { result?: { content?: { text: string }[] } };
const sumBody = JSON.parse(summary.result?.content?.[0]?.text ?? "{}") as { ok?: boolean; data?: { bills?: number } };
check("sales_summary answers with a count for an empty range", sumBody.ok === true && sumBody.data?.bills === 0);

const bad = (await rpc("mcp-manager", "manager", {
  jsonrpc: "2.0",
  id: 5,
  method: "tools/call",
  params: { name: "list_sales", arguments: { from: "2020-02-01", to: "2020-01-01" } },
})) as { result?: { isError?: boolean } };
check("a reversed date range is refused", bad.result?.isError === true);

const tok = await createMcpToken(rawDb, { id: "mcp-manager", role: "manager" }, { name: "check", ttlDays: 7 });
check("a manager can mint a read token", tok.ok === true);
const cashierTok = await createMcpToken(rawDb, { id: "mcp-cashier", role: "cashier" }, { name: "check", ttlDays: 7 });
check("a cashier cannot mint a token", cashierTok.ok === false);

await client.query("DELETE FROM mcp_audit WHERE token_id LIKE 'tok-mcp-%'");
await client.end();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

// app/mcp/route.ts: the POS MCP endpoint (Streamable HTTP, stateless). The same route serves POST; GET and DELETE
// answer 405, because a stateless server keeps no session and opens no standalone event stream.
//
// Order of checks, each before anything touches the database or the MCP SDK:
//   1. Origin: a browser page on another site cannot call the endpoint.
//   2. Size: bodies over 64 KB are refused.
//   3. Bearer token: a personal token from the account page, verified against its SHA-256.
import {
  OAuthError,
  OAuthErrorCode,
  bearerAuthChallengeResponse,
  createMcpHandler,
  originValidationResponse,
  requireBearerAuth,
  type AuthInfo,
  type OAuthTokenVerifier,
} from "@modelcontextprotocol/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import config from "@/project.config.json";
import { withDb, type Db } from "@/lib/db";
import { buildMcpServer, type McpFeatures } from "@/lib/mcp/server";
import { MCP_ROLES, MCP_TOKEN_LENGTH, MCP_TOKEN_PREFIX, asArray, hashToken } from "@/lib/mcp/tokens";

const features: McpFeatures = { ratePerMinute: config.modules.mcp.rateLimitPerMinute };
const MAX_BODY_BYTES = 64 * 1024;

// Hostnames allowed in the Origin header. Clients that are not browsers send no Origin and always pass.
async function allowedOriginHostnames(): Promise<string[]> {
  const { env } = await getCloudflareContext({ async: true });
  const e = env as { APP_URL?: string; MCP_ALLOWED_ORIGINS?: string };
  const appUrl = process.env.APP_URL ?? e.APP_URL;
  const extra = (process.env.MCP_ALLOWED_ORIGINS ?? e.MCP_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return [...(appUrl ? [new URL(appUrl).hostname] : []), ...extra];
}

function verifier(db: Db): OAuthTokenVerifier {
  const invalid = () => new OAuthError(OAuthErrorCode.InvalidToken, "Invalid or expired token");
  return {
    async verifyAccessToken(token: string): Promise<AuthInfo> {
      if (!token.startsWith(MCP_TOKEN_PREFIX) || token.length !== MCP_TOKEN_LENGTH) throw invalid();
      const now = new Date();
      const { rows } = await db.query<{ id: string; user_id: string; scopes: unknown; expires_at: Date; role: string; active: number }>(
        `SELECT t.id, t.user_id, t.scopes, t.expires_at, u.role, u.active
           FROM mcp_tokens t JOIN users u ON u.id = t.user_id
          WHERE t.token_hash = $1 AND t.revoked_at IS NULL AND t.expires_at > $2`,
        [await hashToken(token), now],
      );
      const row = rows[0];
      // A deactivated user, or a role that may not read the store, gets the same answer as an unknown token.
      if (!row || row.active !== 1 || !(MCP_ROLES as readonly string[]).includes(row.role)) throw invalid();
      // Record use at most once a minute.
      await db.query("UPDATE mcp_tokens SET last_used_at = $1 WHERE id = $2 AND (last_used_at IS NULL OR last_used_at < $3)", [
        now,
        row.id,
        new Date(now.getTime() - 60_000),
      ]);
      return {
        token: "redacted", // the raw token is never carried past this point
        clientId: row.id,
        scopes: asArray(row.scopes),
        expiresAt: Math.floor(new Date(row.expires_at).getTime() / 1000),
        extra: { userId: row.user_id, role: row.role },
      };
    },
  };
}

async function serve(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: { code: "method_not_allowed", message: "Use POST" } }), {
      status: 405,
      headers: { allow: "POST", "content-type": "application/json" },
    });
  }
  const blocked = originValidationResponse(request, await allowedOriginHostnames());
  if (blocked) return blocked;
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: { code: "payload_too_large", message: "Body over 64 KB" } }), {
      status: 413,
      headers: { "content-type": "application/json" },
    });
  }
  // No token: answer before opening a database connection.
  if (!request.headers.get("authorization")?.toLowerCase().startsWith("bearer ")) {
    return bearerAuthChallengeResponse(new OAuthError(OAuthErrorCode.InvalidToken, "Missing bearer token"));
  }
  return withDb(async (db) => {
    const auth = await requireBearerAuth({ verifier: verifier(db) })(request);
    if (auth instanceof Response) return auth;
    const handler = createMcpHandler(({ authInfo }) => buildMcpServer(db, authInfo, features));
    const response = await handler.fetch(request, { authInfo: auth });
    // fetch() resolves before the tool has run: the answer is produced while its body is read. Read the whole body here,
    // so the database connection stays open until the tool is done.
    return new Response(await response.arrayBuffer(), { status: response.status, headers: response.headers });
  });
}

export const POST = serve;
export const GET = serve;
export const DELETE = serve;

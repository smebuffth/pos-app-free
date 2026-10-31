-- MCP module tables for PostgreSQL (local container, Supabase, Neon, other). Copy to migrations/000N_mcp.sql
-- (the next free number) only when modules.mcp.enabled is true. MySQL uses mcp.mysql.sql.
-- Supabase: also run `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for both tables (database.md, Supabase).

CREATE TABLE mcp_tokens (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name         TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),  -- the owner's label, e.g. "Claude Code on my laptop"
  token_hash   TEXT NOT NULL UNIQUE,                 -- SHA-256(token) as hex; the raw token is never stored
  token_hint   TEXT NOT NULL,                        -- last 4 characters, so the owner can tell tokens apart
  scopes       JSONB NOT NULL DEFAULT '["read"]'::jsonb,  -- subset of: read, write, admin
  expires_at   TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mcp_tokens_user ON mcp_tokens (user_id);

-- One row per tool call: tool name and outcome only. Never the arguments or the result (they hold personal data).
CREATE TABLE mcp_audit (
  id         TEXT PRIMARY KEY,
  token_id   TEXT REFERENCES mcp_tokens (id) ON DELETE SET NULL,
  tool       TEXT NOT NULL,
  ok         INTEGER NOT NULL CHECK (ok IN (0, 1)),
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mcp_audit_token ON mcp_audit (token_id, created_at);

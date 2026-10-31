-- The owner's AI settings: one row per user. The API key is stored encrypted (lib/crypto-box.ts); only its last four
-- characters are kept in clear, so the owner can see which key is saved.
CREATE TABLE ai_settings (
  user_id     TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  provider    TEXT NOT NULL DEFAULT 'anthropic' CHECK (provider IN ('anthropic', 'openai', 'gemini', 'openrouter', 'custom')),
  api_format  TEXT NOT NULL DEFAULT 'openai' CHECK (api_format IN ('openai', 'anthropic')),
  model       TEXT NOT NULL DEFAULT '',
  base_url    TEXT NOT NULL DEFAULT '',
  api_key_enc TEXT,
  key_last4   TEXT,
  enabled     INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

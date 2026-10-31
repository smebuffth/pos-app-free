import type { Db } from "@/lib/db";
import { decryptFor, encryptFor, encryptionReady } from "@/lib/crypto-box";
import { CLAUDE_MODELS, PROVIDERS, type Provider } from "@/lib/ai/constants";

export type AiSettingsView = {
  provider: Provider;
  apiFormat: "openai" | "anthropic";
  model: string;
  baseUrl: string;
  enabled: boolean;
  hasKey: boolean;
  keyLast4: string | null;
  encryptionReady: boolean;
  configured: boolean;
};

export type AiCallConfig = { provider: Provider; apiFormat: "openai" | "anthropic"; model: string; baseUrl: string; apiKey: string };

export type AiSaveInput = {
  provider: Provider;
  apiFormat: "openai" | "anthropic";
  model: string;
  baseUrl: string;
  enabled: boolean;
  apiKey: string;
};

const MODEL_PATTERN = /^[A-Za-z0-9._:/-]{1,120}$/;

// https://... anywhere, or http:// for this machine only. No credentials, query or fragment. No trailing slash.
export function normalizeBaseUrl(raw: string): { ok: true; value: string } | { ok: false; message: string } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, message: "URL ไม่ถูกต้อง" };
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (!(url.protocol === "https:" || (url.protocol === "http:" && local))) {
    return { ok: false, message: "URL ต้องเป็น https:// (หรือ http:// เฉพาะ localhost)" };
  }
  if (url.username || url.password || url.search || url.hash) {
    return { ok: false, message: "URL ต้องไม่มีชื่อผู้ใช้ รหัสผ่าน หรือพารามิเตอร์" };
  }
  return { ok: true, value: url.toString().replace(/\/+$/, "") };
}

type Row = {
  provider: Provider;
  api_format: "openai" | "anthropic";
  model: string;
  base_url: string;
  api_key_enc: string | null;
  key_last4: string | null;
  enabled: number;
};

export async function readAiSettings(db: Db, userId: string): Promise<AiSettingsView> {
  const { rows } = await db.query<Row>(
    "SELECT provider, api_format, model, base_url, api_key_enc, key_last4, enabled FROM ai_settings WHERE user_id = $1",
    [userId],
  );
  const row = rows[0];
  const ready = await encryptionReady();
  const hasKey = Boolean(row?.api_key_enc);
  const enabled = row?.enabled === 1;
  return {
    provider: row?.provider ?? "anthropic",
    apiFormat: row?.api_format ?? "openai",
    model: row?.model ?? "",
    baseUrl: row?.base_url ?? "",
    enabled,
    hasKey,
    keyLast4: row?.key_last4 ?? null,
    encryptionReady: ready,
    configured: enabled && hasKey && Boolean(row?.model) && ready,
  };
}

// The plaintext key exists only for the duration of one call. It is never stored or returned.
// Answers a question only when AI is switched on. The connection test uses loadAiCallAnyState instead.
export async function loadAiCall(db: Db, userId: string): Promise<AiCallConfig | null> {
  const enabled = await db.query<{ enabled: number }>("SELECT enabled FROM ai_settings WHERE user_id = $1", [userId]);
  if (enabled.rows[0]?.enabled !== 1) return null;
  return loadAiCallAnyState(db, userId);
}

export async function loadAiCallAnyState(db: Db, userId: string): Promise<AiCallConfig | null> {
  const { rows } = await db.query<Row>(
    "SELECT provider, api_format, model, base_url, api_key_enc, key_last4, enabled FROM ai_settings WHERE user_id = $1",
    [userId],
  );
  const row = rows[0];
  if (!row || !row.api_key_enc || !row.model) return null;
  const apiKey = await decryptFor(userId, row.api_key_enc);
  if (!apiKey) return null;
  return { provider: row.provider, apiFormat: row.api_format, model: row.model, baseUrl: row.base_url, apiKey };
}

export type AiSaveResult = { ok: true } | { ok: false; code: string; message: string; status: number };

export async function saveAiSettings(db: Db, userId: string, input: AiSaveInput): Promise<AiSaveResult> {
  if (!PROVIDERS.includes(input.provider)) return { ok: false, code: "validation_error", message: "เลือกผู้ให้บริการ AI", status: 422 };
  const key = input.apiKey.trim();
  if (key && key.length < 16) return { ok: false, code: "validation_error", message: "คีย์ API สั้นเกินไป", status: 422 };

  const model = input.model.trim();
  if (model && !MODEL_PATTERN.test(model)) return { ok: false, code: "validation_error", message: "ชื่อโมเดลมีอักขระที่ไม่รองรับ", status: 422 };
  if (input.provider === "anthropic" && model && !(CLAUDE_MODELS as readonly string[]).includes(model)) {
    return { ok: false, code: "validation_error", message: "โมเดล Claude ต้องอยู่ในรายการที่อนุญาต", status: 422 };
  }

  let baseUrl = "";
  let apiFormat: "openai" | "anthropic" = "openai";
  if (input.provider === "custom") {
    const normalized = normalizeBaseUrl(input.baseUrl);
    if (!normalized.ok) return { ok: false, code: "validation_error", message: normalized.message, status: 422 };
    baseUrl = normalized.value;
    apiFormat = input.apiFormat;
  }

  const { rows } = await db.query<{ api_key_enc: string | null; key_last4: string | null }>(
    "SELECT api_key_enc, key_last4 FROM ai_settings WHERE user_id = $1",
    [userId],
  );
  const existing = rows[0];
  let keyEnc = existing?.api_key_enc ?? null;
  let last4 = existing?.key_last4 ?? null;
  if (key) {
    if (!(await encryptionReady())) return { ok: false, code: "encryption_unavailable", message: "ยังไม่ได้ตั้งค่าการเข้ารหัสของระบบ จึงบันทึกคีย์ไม่ได้", status: 503 };
    keyEnc = await encryptFor(userId, key);
    last4 = key.slice(-4);
  }
  if (input.enabled) {
    if (!keyEnc) return { ok: false, code: "key_required", message: "ต้องบันทึกคีย์ API ก่อนเปิดใช้งาน", status: 422 };
    if (!model) return { ok: false, code: "model_required", message: "ระบุชื่อโมเดลก่อนเปิดใช้งาน", status: 422 };
  }

  const now = new Date();
  if (existing) {
    await db.query(
      `UPDATE ai_settings SET provider = $2, api_format = $3, model = $4, base_url = $5, api_key_enc = $6, key_last4 = $7,
         enabled = $8, updated_at = $9 WHERE user_id = $1`,
      [userId, input.provider, apiFormat, model, baseUrl, keyEnc, last4, input.enabled ? 1 : 0, now],
    );
  } else {
    await db.query(
      `INSERT INTO ai_settings (user_id, provider, api_format, model, base_url, api_key_enc, key_last4, enabled, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, input.provider, apiFormat, model, baseUrl, keyEnc, last4, input.enabled ? 1 : 0, now],
    );
  }
  return { ok: true };
}

// Removing the key also turns AI off: nothing can be sent without a key.
export async function removeAiKey(db: Db, userId: string): Promise<void> {
  await db.query("UPDATE ai_settings SET api_key_enc = NULL, key_last4 = NULL, enabled = 0, updated_at = $2 WHERE user_id = $1", [userId, new Date()]);
}

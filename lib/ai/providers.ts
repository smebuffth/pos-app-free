import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { CLAUDE_MODELS, type Provider } from "@/lib/ai/constants";

// Each provider is called through its official SDK. Errors are mapped to a short Thai message here. The SDK's own
// message is never forwarded, because it can carry request details. The key never leaves this module.
export type AiErrorCode = "invalid_key" | "forbidden" | "bad_model" | "rate_limited" | "unreachable" | "refused" | "truncated" | "bad_request" | "provider_error";

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export type ProviderConfig = { provider: Provider; apiFormat: "openai" | "anthropic"; model: string; baseUrl: string; apiKey: string };

const MAX_OUTPUT = 1200;
const TIMEOUT_MS = 60_000;

const OPENROUTER_URL = "https://openrouter.ai/api/v1";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta";

export async function generateText(cfg: ProviderConfig, system: string, user: string): Promise<string> {
  try {
    if (cfg.provider === "anthropic" || (cfg.provider === "custom" && cfg.apiFormat === "anthropic")) {
      return await claudeText(cfg, system, user);
    }
    if (cfg.provider === "gemini") return await geminiText(cfg, system, user);
    return await openaiText(cfg, system, user);
  } catch (err) {
    throw mapError(err);
  }
}

export async function listModels(cfg: ProviderConfig): Promise<string[]> {
  try {
    if (cfg.provider === "anthropic") return [...CLAUDE_MODELS];
    if (cfg.provider === "gemini") return await geminiModels(cfg.apiKey);
    if (cfg.provider === "openrouter") return await openrouterModels();
    if (cfg.provider === "custom" && cfg.apiFormat === "anthropic") return await anthropicModels(cfg);
    return await openaiModels(cfg);
  } catch (err) {
    throw mapError(err);
  }
}

function claudeClient(cfg: ProviderConfig) {
  return new Anthropic({ apiKey: cfg.apiKey, baseURL: cfg.provider === "custom" ? cfg.baseUrl : undefined, maxRetries: 1, timeout: TIMEOUT_MS });
}

function openaiClient(cfg: ProviderConfig) {
  const baseURL = cfg.provider === "openrouter" ? OPENROUTER_URL : cfg.provider === "custom" ? cfg.baseUrl : undefined;
  return new OpenAI({
    apiKey: cfg.apiKey,
    baseURL,
    defaultHeaders: cfg.provider === "openrouter" ? { "X-Title": "Nisia POS" } : undefined,
    maxRetries: 1,
    timeout: TIMEOUT_MS,
  });
}

async function claudeText(cfg: ProviderConfig, system: string, user: string): Promise<string> {
  const response = await claudeClient(cfg).messages.create({
    model: cfg.model,
    max_tokens: MAX_OUTPUT,
    system,
    messages: [{ role: "user", content: user }],
  });
  if (response.stop_reason === "refusal") throw new AiError("refused", "ผู้ให้บริการไม่ตอบคำถามนี้ ลองถามใหม่ด้วยคำที่ต่างออกไป", 422);
  if (response.stop_reason === "max_tokens") throw new AiError("truncated", "คำตอบยาวเกินไป ลองถามให้สั้นลง", 502);
  return response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("").trim();
}

async function openaiText(cfg: ProviderConfig, system: string, user: string): Promise<string> {
  const completion = await openaiClient(cfg).chat.completions.create({
    model: cfg.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_completion_tokens: MAX_OUTPUT,
  });
  const choice = completion.choices[0];
  if (choice?.finish_reason === "content_filter") throw new AiError("refused", "ผู้ให้บริการไม่ตอบคำถามนี้ ลองถามใหม่ด้วยคำที่ต่างออกไป", 422);
  if (choice?.finish_reason === "length") throw new AiError("truncated", "คำตอบยาวเกินไป ลองถามให้สั้นลง", 502);
  return (choice?.message.content ?? "").trim();
}

async function geminiText(cfg: ProviderConfig, system: string, user: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: cfg.apiKey });
  const response = await ai.models.generateContent({
    model: cfg.model,
    contents: user,
    config: { systemInstruction: system, maxOutputTokens: MAX_OUTPUT },
  });
  const reason = response.candidates?.[0]?.finishReason;
  if (reason === "SAFETY") throw new AiError("refused", "ผู้ให้บริการไม่ตอบคำถามนี้ ลองถามใหม่ด้วยคำที่ต่างออกไป", 422);
  if (reason === "MAX_TOKENS") throw new AiError("truncated", "คำตอบยาวเกินไป ลองถามให้สั้นลง", 502);
  return (response.text ?? "").trim();
}

async function openaiModels(cfg: ProviderConfig): Promise<string[]> {
  const out: string[] = [];
  for await (const model of openaiClient(cfg).models.list()) {
    out.push(model.id);
    if (out.length >= 200) break;
  }
  return out.sort();
}

async function anthropicModels(cfg: ProviderConfig): Promise<string[]> {
  const out: string[] = [];
  for await (const model of claudeClient(cfg).models.list()) {
    if ((CLAUDE_MODELS as readonly string[]).includes(model.id)) out.push(model.id);
  }
  return out.length ? out.sort() : [...CLAUDE_MODELS];
}

async function openrouterModels(): Promise<string[]> {
  const res = await fetch(`${OPENROUTER_URL}/models`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw Object.assign(new Error("list"), { status: res.status });
  const body = (await res.json()) as { data?: { id: string }[] };
  return (body.data ?? []).map((m) => m.id).slice(0, 300).sort();
}

// The key goes in a header, not the URL, so it cannot appear in a log line that prints a URL.
async function geminiModels(apiKey: string): Promise<string[]> {
  const res = await fetch(`${GEMINI_URL}/models?pageSize=200`, { headers: { "x-goog-api-key": apiKey }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw Object.assign(new Error("list"), { status: res.status });
  const body = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
  return (body.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .sort();
}

function mapError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  const e = err as { status?: number; name?: string; message?: string };
  if (e.name === "APIConnectionError" || e.name === "APIConnectionTimeoutError" || e.name === "TimeoutError" || e.name === "TypeError") {
    return new AiError("unreachable", "เชื่อมต่อผู้ให้บริการไม่ได้ ตรวจสอบอินเทอร์เน็ตหรือ URL", 502);
  }
  const status = typeof e.status === "number" ? e.status : 0;
  if (status === 400 && /api.?key/i.test(e.message ?? "")) return new AiError("invalid_key", "คีย์ API ไม่ถูกต้อง ตรวจสอบคีย์ในหน้าตั้งค่า AI", 422);
  if (status === 400) return new AiError("bad_request", "คำขอไม่ถูกต้อง ลองใหม่อีกครั้ง", 400);
  if (status === 401) return new AiError("invalid_key", "คีย์ API ไม่ถูกต้อง ตรวจสอบคีย์ในหน้าตั้งค่า AI", 422);
  if (status === 403) return new AiError("forbidden", "คีย์นี้ไม่มีสิทธิ์ใช้โมเดลนี้ ตรวจสอบบัญชีของผู้ให้บริการ", 422);
  if (status === 404) return new AiError("bad_model", "ไม่พบโมเดลหรือ URL นี้ ตรวจสอบชื่อโมเดลและ URL", 422);
  if (status === 429) return new AiError("rate_limited", "ผู้ให้บริการจำกัดการเรียกใช้ ลองใหม่อีกสักครู่", 429);
  console.error("ai provider error", status || "unknown");
  return new AiError("provider_error", "ผู้ให้บริการตอบกลับผิดปกติ ลองใหม่อีกครั้ง", 502);
}

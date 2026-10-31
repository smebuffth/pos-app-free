import { connection } from "next/server";
import { withDb } from "@/lib/db";
import { takeQuota } from "@/lib/auth/rate-limit";
import { loadAiCallAnyState } from "@/lib/ai/settings";
import { generateText } from "@/lib/ai/providers";
import { AI_QUOTA, aiFailure, handle, fail, ok, requireOwnerApi } from "@/lib/ai/guard";

// Sends a one-word request with the saved settings (enabled or not). It counts against the hourly quota.
export async function POST() {
  return handle(async () => {
    await connection();
    const owner = await requireOwnerApi();
    const cfg = await withDb(async (db) => {
      const allowed = await takeQuota(db, `ai:${owner.id}`, AI_QUOTA.max, AI_QUOTA.windowMs);
      return allowed ? loadAiCallAnyState(db, owner.id) : "quota";
    });
    if (cfg === "quota") return fail(429, "rate_limited", "ใช้ AI ครบโควตาต่อชั่วโมงแล้ว ลองใหม่ภายหลัง");
    if (!cfg) return fail(422, "key_required", "บันทึกคีย์ API และชื่อโมเดลก่อน");
    try {
      await generateText(cfg, "Reply with the single word OK.", "ping");
      return ok({ ok: true, provider: cfg.provider, model: cfg.model });
    } catch (err) {
      return aiFailure(err);
    }
  });
}

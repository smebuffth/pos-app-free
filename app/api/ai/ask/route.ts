import { connection } from "next/server";
import { z } from "zod";
import { withDb } from "@/lib/db";
import { takeQuota } from "@/lib/auth/rate-limit";
import { loadAiCall } from "@/lib/ai/settings";
import { generateText } from "@/lib/ai/providers";
import { ASSISTANT_SYSTEM, buildPrompt, buildSnapshot } from "@/lib/ai/assistant";
import { AI_QUESTION_MAX } from "@/lib/ai/constants";
import { AI_QUOTA, aiFailure, handle, fail, ok, requireOwnerApi } from "@/lib/ai/guard";

// Answers one question about the store. The model sees a snapshot the server built. It saves nothing.
const bodySchema = z.object({ question: z.string().trim().min(1, "พิมพ์คำถาม").max(AI_QUESTION_MAX, "คำถามยาวเกินไป") });

export async function POST(request: Request) {
  return handle(async () => {
    await connection();
    const owner = await requireOwnerApi();
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail(400, "validation_error", parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");

    const result = await withDb(async (db) => {
      const allowed = await takeQuota(db, `ai:${owner.id}`, AI_QUOTA.max, AI_QUOTA.windowMs);
      if (!allowed) return { kind: "quota" as const };
      const cfg = await loadAiCall(db, owner.id);
      if (!cfg) return { kind: "off" as const };
      const snapshot = await buildSnapshot(db);
      return { kind: "ready" as const, cfg, snapshot };
    });
    if (result.kind === "quota") return fail(429, "rate_limited", "ใช้ AI ครบโควตาต่อชั่วโมงแล้ว ลองใหม่ภายหลัง");
    if (result.kind === "off") return fail(422, "ai_off", "ยังไม่ได้เปิดใช้งาน AI ไปที่ เชื่อมต่อ AI เพื่อตั้งค่า");

    try {
      const answer = await generateText(result.cfg, ASSISTANT_SYSTEM, buildPrompt(parsed.data.question, result.snapshot));
      return ok({ answer: answer || "ยังไม่มีคำตอบ ลองถามใหม่อีกครั้ง" });
    } catch (err) {
      console.error("ai ask failed", (err as { code?: string }).code ?? "unknown");
      return aiFailure(err);
    }
  });
}

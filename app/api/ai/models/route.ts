import { connection } from "next/server";
import { withDb } from "@/lib/db";
import { loadAiCallAnyState } from "@/lib/ai/settings";
import { listModels } from "@/lib/ai/providers";
import { aiFailure, handle, fail, ok, requireOwnerApi } from "@/lib/ai/guard";

// The model list comes from the provider's own endpoint, with the saved key. Does not count against the quota.
export async function GET() {
  return handle(async () => {
    await connection();
    const owner = await requireOwnerApi();
    const cfg = await withDb((db) => loadAiCallAnyState(db, owner.id));
    if (!cfg) return fail(422, "key_required", "บันทึกคีย์ API ก่อน จึงดึงรายการโมเดลได้");
    try {
      return ok({ models: await listModels(cfg) });
    } catch (err) {
      return aiFailure(err);
    }
  });
}

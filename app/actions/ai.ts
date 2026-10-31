"use server";

import { z } from "zod";
import { tx, withDb } from "@/lib/db";
import { audit } from "@/lib/audit";
import { bad, good, type Result } from "@/lib/http";
import { requireOwner } from "@/lib/auth/guards";
import { PROVIDERS } from "@/lib/ai/constants";
import { removeAiKey, saveAiSettings } from "@/lib/ai/settings";

const schema = z.object({
  provider: z.enum(PROVIDERS, "เลือกผู้ให้บริการ AI"),
  apiFormat: z.enum(["openai", "anthropic"]),
  baseUrl: z.string().max(300),
  model: z.string().max(120),
  apiKey: z.string().max(500),
  enabled: z.boolean(),
});

// The key is written once, encrypted, and never echoed. The audit row records the change, not the key.
export async function saveAiSettingsAction(_prev: Result<null> | undefined, formData: FormData): Promise<Result<null>> {
  const owner = await requireOwner();
  const parsed = schema.safeParse({
    provider: String(formData.get("provider") ?? ""),
    apiFormat: String(formData.get("apiFormat") ?? "openai"),
    baseUrl: String(formData.get("baseUrl") ?? ""),
    model: String(formData.get("model") ?? ""),
    apiKey: String(formData.get("apiKey") ?? ""),
    enabled: formData.get("enabled") === "1",
  });
  if (!parsed.success) return bad("validation_error", parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");

  const result = await withDb((db) =>
    tx(db, async () => {
      const saved = await saveAiSettings(db, owner.id, parsed.data);
      if (saved.ok) {
        await audit(db, owner.id, "ai.settings", "user", owner.id, {
          provider: parsed.data.provider,
          enabled: parsed.data.enabled,
          keyChanged: parsed.data.apiKey.trim() !== "",
        });
      }
      return saved;
    }),
  );
  if (!result.ok) return bad(result.code, result.message);
  return good(null);
}

export async function removeAiKeyAction(): Promise<void> {
  const owner = await requireOwner();
  await withDb((db) =>
    tx(db, async () => {
      await removeAiKey(db, owner.id);
      await audit(db, owner.id, "ai.key_removed", "user", owner.id);
    }),
  );
}

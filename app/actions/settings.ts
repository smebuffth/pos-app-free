"use server";

import { z } from "zod";
import { withDb, tx } from "@/lib/db";
import { audit } from "@/lib/audit";
import { bad, good, type Result } from "@/lib/http";
import { requireOwner } from "@/lib/auth/guards";
import { saveStoreSettings } from "@/lib/pos/settings";

const settingsSchema = z.object({
  name: z.string().trim().min(1, "กรอกชื่อร้าน").max(120),
  address: z.string().trim().max(300),
  taxId: z.string().trim().max(20),
  vatMode: z.enum(["included", "none"]),
  vatBp: z.number().int().min(0).max(3000),
  receiptFooter: z.string().trim().max(200),
  promptpayId: z.string().trim().max(20),
  cashierDiscountLimitBp: z.number().int().min(0).max(10000),
});

export async function saveSettingsAction(_prev: Result<null> | undefined, formData: FormData): Promise<Result<null>> {
  const owner = await requireOwner();
  const parsed = settingsSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    address: String(formData.get("address") ?? ""),
    taxId: String(formData.get("taxId") ?? ""),
    vatMode: String(formData.get("vatMode") ?? "included"),
    vatBp: Math.round(Number(formData.get("vatPercent") ?? 7) * 100),
    receiptFooter: String(formData.get("receiptFooter") ?? ""),
    promptpayId: String(formData.get("promptpayId") ?? "").replace(/[\s-]/g, ""),
    cashierDiscountLimitBp: Math.round(Number(formData.get("discountLimitPercent") ?? 10) * 100),
  });
  if (!parsed.success) return bad("validation_error", parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
  if (parsed.data.promptpayId && !/^(0\d{9}|\d{13}|0\d{8})$/.test(parsed.data.promptpayId)) {
    return bad("validation_error", "เลข PromptPay ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลขนิติบุคคล/บัตรประชาชน 13 หลัก");
  }
  await withDb((db) =>
    tx(db, async () => {
      await saveStoreSettings(db, parsed.data);
      await audit(db, owner.id, "settings.update", "store", "1", { vatMode: parsed.data.vatMode, vatBp: parsed.data.vatBp });
    }),
  );
  return good(null);
}

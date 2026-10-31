"use server";

import { z } from "zod";
import { withDb } from "@/lib/db";
import { bad, good, type Result } from "@/lib/http";
import { requireManager, requireUser } from "@/lib/auth/guards";
import { createSale, SaleError, voidSale, type SaleResult } from "@/lib/pos/sales";

const onlineLine = z.object({
  productId: z.string().min(1).max(64),
  qty: z.number().int().min(1).max(999),
  lineDiscountSatang: z.number().int().min(0).max(1_000_000_000),
});

const checkoutSchema = z.object({
  id: z.uuid("รหัสบิลไม่ถูกต้อง"),
  shiftId: z.string().min(1).max(64),
  items: z.array(onlineLine).min(1, "ยังไม่มีสินค้าในบิล").max(100),
  billDiscountSatang: z.number().int().min(0).max(1_000_000_000),
  payment: z.enum(["cash", "promptpay", "transfer", "card"]),
  tenderedSatang: z.number().int().min(0).max(1_000_000_000).nullable(),
});

export async function checkoutAction(payload: unknown): Promise<Result<SaleResult>> {
  const user = await requireUser();
  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) return bad("validation_error", parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
  try {
    const result = await withDb((db) =>
      createSale(db, user, { ...parsed.data, items: parsed.data.items, offline: false, clientCreatedAt: new Date() }),
    );
    return good(result);
  } catch (err) {
    if (err instanceof SaleError) return bad(err.code, err.message);
    throw err;
  }
}

const voidSchema = z.object({ saleId: z.string().min(1).max(64), reason: z.string().trim().min(3, "ระบุเหตุผลการยกเลิก").max(200) });

export async function voidSaleAction(_prev: Result<null> | undefined, formData: FormData): Promise<Result<null>> {
  const user = await requireManager();
  const parsed = voidSchema.safeParse({ saleId: String(formData.get("saleId") ?? ""), reason: String(formData.get("reason") ?? "") });
  if (!parsed.success) return bad("validation_error", parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
  try {
    await withDb((db) => voidSale(db, user, parsed.data.saleId, parsed.data.reason));
    return good(null);
  } catch (err) {
    if (err instanceof SaleError) return bad(err.code, err.message);
    throw err;
  }
}

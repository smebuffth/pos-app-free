"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { tx, withDb } from "@/lib/db";
import { bad, good, type Result } from "@/lib/http";
import { requireUser } from "@/lib/auth/guards";
import { addCashMovement, closeShift, getOpenShift, openShift } from "@/lib/pos/shifts";
import { satang, text } from "@/lib/validation";

export async function openShiftAction(_prev: Result<string> | undefined, formData: FormData): Promise<Result<string>> {
  const user = await requireUser();
  const parsed = z.object({ openingCashSatang: satang }).safeParse({
    openingCashSatang: Math.round(Number(formData.get("openingBaht") ?? 0) * 100),
  });
  if (!parsed.success) return bad("validation_error", "กรอกเงินทอนตั้งต้นให้ถูกต้อง");
  const id = await withDb((db) => tx(db, () => openShift(db, user.id, parsed.data.openingCashSatang)));
  if (!id) return bad("shift_open", "มีกะที่เปิดอยู่แล้ว");
  revalidatePath("/", "layout");
  return good(id);
}

export async function cashMovementAction(_prev: Result<null> | undefined, formData: FormData): Promise<Result<null>> {
  const user = await requireUser();
  const parsed = z
    .object({ kind: z.enum(["in", "out"]), amountSatang: z.number().int().min(1).max(1_000_000_000), reason: text(120).min(1, "ระบุเหตุผล") })
    .safeParse({
      kind: String(formData.get("kind") ?? ""),
      amountSatang: Math.round(Number(formData.get("amountBaht") ?? 0) * 100),
      reason: String(formData.get("reason") ?? ""),
    });
  if (!parsed.success) return bad("validation_error", parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
  await withDb(async (db) => {
    const shift = await getOpenShift(db);
    if (!shift) return;
    await tx(db, () => addCashMovement(db, user.id, shift.id, parsed.data.kind, parsed.data.amountSatang, parsed.data.reason));
  });
  return good(null);
}

export async function closeShiftAction(_prev: Result<{ expected: number; variance: number }> | undefined, formData: FormData) {
  const user = await requireUser();
  const parsed = z.object({ counted: satang }).safeParse({ counted: Math.round(Number(formData.get("countedBaht") ?? 0) * 100) });
  if (!parsed.success) return bad("validation_error", "กรอกเงินที่นับได้ให้ถูกต้อง");
  const result = await withDb(async (db) => {
    const shift = await getOpenShift(db);
    if (!shift) return null;
    return tx(db, () => closeShift(db, user.id, shift.id, parsed.data.counted));
  });
  if (!result) return bad("no_open_shift", "ไม่มีกะที่เปิดอยู่");
  revalidatePath("/", "layout");
  return good(result);
}

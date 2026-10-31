"use server";

import { z } from "zod";
import { withDb, tx } from "@/lib/db";
import { bad, good, type Result } from "@/lib/http";
import { requireManager } from "@/lib/auth/guards";
import { DuplicateCode, NotFound, createProduct, saveCategory, updateProduct } from "@/lib/pos/catalog";
import { adjustStock, receiveStock } from "@/lib/pos/stock";
import { id, qty, satang, text } from "@/lib/validation";

const productSchema = z.object({
  id: z.string().max(64).optional(),
  sku: z.string().trim().min(1, "กรอกรหัสสินค้า").max(40),
  barcode: z.string().trim().max(64).optional(),
  name: z.string().trim().min(1, "กรอกชื่อสินค้า").max(120),
  unit: z.string().trim().min(1).max(20),
  categoryId: z.string().max(64).optional(),
  priceSatang: satang,
  costSatang: satang,
  lowStockThreshold: z.number().int().min(0).max(100000),
  active: z.boolean(),
});

function fromForm(formData: FormData) {
  const raw = {
    id: String(formData.get("id") ?? "") || undefined,
    sku: String(formData.get("sku") ?? ""),
    barcode: String(formData.get("barcode") ?? "") || undefined,
    name: String(formData.get("name") ?? ""),
    unit: String(formData.get("unit") ?? "ชิ้น"),
    categoryId: String(formData.get("categoryId") ?? "") || undefined,
    priceSatang: Math.round(Number(formData.get("priceBaht") ?? 0) * 100),
    costSatang: Math.round(Number(formData.get("costBaht") ?? 0) * 100),
    lowStockThreshold: Number(formData.get("lowStockThreshold") ?? 5),
    active: formData.get("active") === "1",
  };
  return productSchema.safeParse(raw);
}

export async function saveProductAction(_prev: Result<string> | undefined, formData: FormData): Promise<Result<string>> {
  const user = await requireManager();
  const parsed = fromForm(formData);
  if (!parsed.success) return bad("validation_error", parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
  const input = {
    sku: parsed.data.sku,
    barcode: parsed.data.barcode || null,
    name: parsed.data.name,
    unit: parsed.data.unit,
    categoryId: parsed.data.categoryId || null,
    priceSatang: parsed.data.priceSatang,
    costSatang: parsed.data.costSatang,
    lowStockThreshold: parsed.data.lowStockThreshold,
    active: parsed.data.active,
  };
  try {
    return await withDb(async (db) => {
      if (parsed.data.id) {
        await tx(db, () => updateProduct(db, user.id, parsed.data.id as string, input));
        return good(parsed.data.id as string);
      }
      const newId = await tx(db, () => createProduct(db, user.id, input));
      return good(newId);
    });
  } catch (err) {
    if (err instanceof DuplicateCode) return bad("duplicate", "รหัสสินค้าหรือบาร์โค้ดนี้มีอยู่แล้ว");
    if (err instanceof NotFound) return bad("not_found", "ไม่พบสินค้า");
    throw err;
  }
}

export async function saveCategoryAction(_prev: Result<null> | undefined, formData: FormData): Promise<Result<null>> {
  await requireManager();
  const parsed = z
    .object({
      id: z.string().max(64).optional(),
      name: z.string().trim().min(1, "กรอกชื่อหมวดหมู่").max(60),
      sortOrder: z.number().int().min(0).max(999),
      active: z.boolean(),
    })
    .safeParse({
      id: String(formData.get("id") ?? "") || undefined,
      name: String(formData.get("name") ?? ""),
      sortOrder: Number(formData.get("sortOrder") ?? 0),
      active: formData.get("active") === "1",
    });
  if (!parsed.success) return bad("validation_error", parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
  await withDb((db) => saveCategory(db, parsed.data.id ?? null, parsed.data.name, parsed.data.sortOrder, parsed.data.active));
  return good(null);
}

const stockSchema = z.object({
  productId: id,
  qty: qty,
  note: text(200),
});

export async function receiveStockAction(_prev: Result<null> | undefined, formData: FormData): Promise<Result<null>> {
  const user = await requireManager();
  const parsed = stockSchema.safeParse({ productId: String(formData.get("productId") ?? ""), qty: Number(formData.get("qty")), note: String(formData.get("note") ?? "") });
  if (!parsed.success) return bad("validation_error", parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
  await withDb((db) => tx(db, () => receiveStock(db, user.id, parsed.data.productId, parsed.data.qty, parsed.data.note)));
  return good(null);
}

const adjustSchema = z.object({
  productId: id,
  delta: z.number().int().min(-100000).max(100000).refine((v) => v !== 0, "จำนวนที่ปรับต้องไม่เป็น 0"),
  reason: z.string().trim().min(1, "ระบุเหตุผลการปรับ").max(200),
});

export async function adjustStockAction(_prev: Result<null> | undefined, formData: FormData): Promise<Result<null>> {
  const user = await requireManager();
  const parsed = adjustSchema.safeParse({
    productId: String(formData.get("productId") ?? ""),
    delta: Number(formData.get("delta")),
    reason: String(formData.get("reason") ?? ""),
  });
  if (!parsed.success) return bad("validation_error", parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
  await withDb((db) => tx(db, () => adjustStock(db, user.id, parsed.data.productId, parsed.data.delta, parsed.data.reason)));
  return good(null);
}

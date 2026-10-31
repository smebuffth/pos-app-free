import type { Db } from "@/lib/db";
import { isUniqueViolation, placeholders, tx } from "@/lib/db";
import { audit } from "@/lib/audit";
import { bangkokDate, receiptNo } from "@/lib/ids";
import { vatIncluded } from "@/lib/money";
import type { AuthUser } from "@/lib/auth/session";
import { getStoreSettings } from "@/lib/pos/settings";
import { moveStock, recordMovement } from "@/lib/pos/stock";
import { getShift } from "@/lib/pos/shifts";

export type PaymentMethod = "cash" | "promptpay" | "transfer" | "card";

export type SaleLineInput = {
  productId: string;
  qty: number;
  lineDiscountSatang: number;
  // Only for an offline sale: the price the cashier charged from the catalog on the device.
  unitPriceSatang?: number;
};

export type SaleInput = {
  id: string;
  shiftId: string;
  items: SaleLineInput[];
  billDiscountSatang: number;
  payment: PaymentMethod;
  tenderedSatang: number | null;
  offline: boolean;
  clientCreatedAt: Date;
};

export type SaleResult = {
  id: string;
  receiptNo: string;
  totalSatang: number;
  changeSatang: number | null;
  duplicate: boolean;
};

// A business rule the cashier can act on. The code is stable; the message is Thai and shown to the user.
export class SaleError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

// Each sale's id is generated on the device, so the same sale sent twice is stored once.
async function existingSale(db: Db, id: string): Promise<SaleResult | null> {
  const { rows } = await db.query<{ id: string; receipt_no: string; total_satang: number; change_satang: number | null }>(
    "SELECT id, receipt_no, total_satang, change_satang FROM sales WHERE id = $1",
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    receiptNo: row.receipt_no,
    totalSatang: row.total_satang,
    changeSatang: row.change_satang,
    duplicate: true,
  };
}

// Creates the counter row outside any transaction, so a unique violation here does not abort one.
async function ensureCounter(db: Db, name: string): Promise<void> {
  const { rows } = await db.query<{ value: number }>("SELECT value FROM counters WHERE name = $1", [name]);
  if (rows[0]) return;
  try {
    await db.query("INSERT INTO counters (name, value) VALUES ($1, 0)", [name]);
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
  }
}

async function nextCounter(db: Db, name: string): Promise<number> {
  await db.query("UPDATE counters SET value = value + 1 WHERE name = $1", [name]);
  const { rows } = await db.query<{ value: number | string }>("SELECT value FROM counters WHERE name = $1", [name]);
  return Number(rows[0].value);
}

// Merges repeated lines for the same product, so the stock check sees the full quantity.
function mergeLines(items: SaleLineInput[]) {
  const merged = new Map<string, { qty: number; lineDiscountSatang: number; unitPriceSatang?: number }>();
  for (const item of items) {
    const current = merged.get(item.productId);
    if (current) {
      current.qty += item.qty;
      current.lineDiscountSatang += item.lineDiscountSatang;
    } else {
      merged.set(item.productId, { ...item });
    }
  }
  return merged;
}

export async function createSale(db: Db, actor: AuthUser, input: SaleInput): Promise<SaleResult> {
  const already = await existingSale(db, input.id);
  if (already) return already;

  const shift = await getShift(db, input.shiftId);
  if (!shift || shift.status !== "open") throw new SaleError("shift_closed", "กะนี้ปิดแล้ว กรุณาเปิดกะใหม่");

  const merged = mergeLines(input.items);
  if (merged.size === 0) throw new SaleError("empty_cart", "ยังไม่มีสินค้าในบิล");

  const productIds = [...merged.keys()];
  const { rows: products } = await db.query<{ id: string; sku: string; name: string; price_satang: number; active: number }>(
    `SELECT id, sku, name, price_satang, active FROM products WHERE id IN (${placeholders(productIds.length)})`,
    productIds,
  );
  const byId = new Map(products.map((p) => [p.id, p]));

  const settings = await getStoreSettings(db);

  // Prices come from the database. The one exception is an offline sale: the price was charged on the device
  // before the connection dropped, so the sale keeps that price and is reviewed by the owner.
  let grossSubtotal = 0;
  let lineDiscountTotal = 0;
  const lines: { productId: string; sku: string; name: string; unitPrice: number; qty: number; lineDiscount: number; lineTotal: number }[] = [];
  for (const [productId, line] of merged) {
    const product = byId.get(productId);
    if (!product || product.active !== 1) throw new SaleError("product_unavailable", "มีสินค้าที่ไม่พร้อมขาย");
    const unitPrice = input.offline && line.unitPriceSatang !== undefined ? line.unitPriceSatang : product.price_satang;
    const gross = unitPrice * line.qty;
    if (line.lineDiscountSatang > gross) throw new SaleError("discount_too_large", "ส่วนลดมากกว่าราคาสินค้า");
    lines.push({
      productId,
      sku: product.sku,
      name: product.name,
      unitPrice,
      qty: line.qty,
      lineDiscount: line.lineDiscountSatang,
      lineTotal: gross - line.lineDiscountSatang,
    });
    grossSubtotal += gross;
    lineDiscountTotal += line.lineDiscountSatang;
  }

  const subtotal = grossSubtotal - lineDiscountTotal;
  if (input.billDiscountSatang > subtotal) throw new SaleError("discount_too_large", "ส่วนลดมากกว่ายอดบิล");
  const total = subtotal - input.billDiscountSatang;
  const discountTotal = lineDiscountTotal + input.billDiscountSatang;

  // A cashier may discount up to the store limit. Above it, a manager or owner must be the one signed in.
  let approvedBy: string | null = null;
  if (discountTotal > 0 && grossSubtotal > 0 && discountTotal * 10000 > grossSubtotal * settings.cashierDiscountLimitBp) {
    if (actor.role === "cashier") {
      throw new SaleError("discount_needs_manager", "ส่วนลดเกินวงเงินของพนักงาน ให้ผู้จัดการเข้าสู่ระบบแล้วทำรายการ");
    }
    approvedBy = actor.id;
  }

  let tendered: number | null = null;
  let change: number | null = null;
  if (input.payment === "cash") {
    if (input.tenderedSatang === null || input.tenderedSatang < total) throw new SaleError("insufficient_cash", "รับเงินไม่พอ");
    tendered = input.tenderedSatang;
    change = tendered - total;
  }
  const vat = settings.vatMode === "included" ? vatIncluded(total, settings.vatBp) : 0;

  const today = bangkokDate();
  await ensureCounter(db, `receipt:${today}`);

  try {
    return await tx(db, async () => {
      const seq = await nextCounter(db, `receipt:${today}`);
      const receipt = receiptNo(today, seq);

      for (const line of lines) {
        if (input.offline) {
          // Offline: the sale is accepted even if it takes stock below zero. The owner reviews those products.
          await moveStock(db, { productId: line.productId, kind: "sale", qtyChange: -line.qty, actorId: actor.id, refId: input.id });
        } else {
          const res = await db.query(
            "UPDATE products SET stock_qty = stock_qty - $2, updated_at = $3 WHERE id = $1 AND stock_qty >= $2",
            [line.productId, line.qty, new Date()],
          );
          if (!res.rowCount) throw new SaleError("insufficient_stock", `สินค้า ${line.name} มีไม่พอขาย`);
          await recordMovement(db, { productId: line.productId, kind: "sale", qtyChange: -line.qty, actorId: actor.id, refId: input.id });
        }
      }

      await db.query(
        `INSERT INTO sales (id, receipt_no, shift_id, cashier_id, status, subtotal_satang, discount_satang, total_satang,
           vat_satang, payment_method, tendered_satang, change_satang, discount_approved_by, offline, client_created_at, created_at)
         VALUES ($1, $2, $3, $4, 'completed', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          input.id,
          receipt,
          input.shiftId,
          actor.id,
          subtotal,
          discountTotal,
          total,
          vat,
          input.payment,
          tendered,
          change,
          approvedBy,
          input.offline ? 1 : 0,
          input.clientCreatedAt,
          new Date(),
        ],
      );
      for (const line of lines) {
        await db.query(
          `INSERT INTO sale_items (id, sale_id, product_id, sku, name, unit_price_satang, qty, line_discount_satang, line_total_satang)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [crypto.randomUUID(), input.id, line.productId, line.sku, line.name, line.unitPrice, line.qty, line.lineDiscount, line.lineTotal],
        );
      }
      if (input.offline) {
        await audit(db, actor.id, "sale.offline_synced", "sale", input.id, { total, lines: lines.length, payment: input.payment });
      }
      return { id: input.id, receiptNo: receipt, totalSatang: total, changeSatang: change, duplicate: false };
    });
  } catch (err) {
    // Two devices sent the same sale at once: the second one finds the first and returns it.
    if (isUniqueViolation(err)) {
      const found = await existingSale(db, input.id);
      if (found) return found;
    }
    throw err;
  }
}

export async function voidSale(db: Db, actor: AuthUser, saleId: string, reason: string): Promise<void> {
  await tx(db, async () => {
    const { rows } = await db.query<{ status: string; shift_id: string }>("SELECT status, shift_id FROM sales WHERE id = $1", [saleId]);
    const sale = rows[0];
    if (!sale) throw new SaleError("not_found", "ไม่พบบิล");
    if (sale.status !== "completed") throw new SaleError("already_voided", "บิลนี้ถูกยกเลิกแล้ว");
    const shift = await getShift(db, sale.shift_id);
    if (!shift || shift.status !== "open") throw new SaleError("shift_closed", "กะนี้ปิดแล้ว ยกเลิกบิลไม่ได้");

    const res = await db.query(
      "UPDATE sales SET status = 'voided', voided_by = $2, voided_at = $3, void_reason = $4 WHERE id = $1 AND status = 'completed'",
      [saleId, actor.id, new Date(), reason],
    );
    if (!res.rowCount) throw new SaleError("already_voided", "บิลนี้ถูกยกเลิกแล้ว");

    const { rows: items } = await db.query<{ product_id: string; qty: number }>(
      "SELECT product_id, qty FROM sale_items WHERE sale_id = $1",
      [saleId],
    );
    for (const item of items) {
      await moveStock(db, { productId: item.product_id, kind: "void", qtyChange: item.qty, actorId: actor.id, refId: saleId });
    }
    await audit(db, actor.id, "sale.void", "sale", saleId, { reason });
  });
}

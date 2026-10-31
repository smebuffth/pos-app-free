import type { Db } from "@/lib/db";
import { placeholders } from "@/lib/db";
import { bangkokDate } from "@/lib/ids";

export type SaleRow = {
  id: string;
  receiptNo: string;
  createdAt: Date;
  cashier: string;
  status: "completed" | "voided";
  payment: "cash" | "promptpay" | "transfer" | "card";
  subtotalSatang: number;
  discountSatang: number;
  vatSatang: number;
  totalSatang: number;
  offline: boolean;
  voidReason: string | null;
};

type SaleDbRow = {
  id: string;
  receipt_no: string;
  created_at: Date;
  cashier: string;
  status: "completed" | "voided";
  payment_method: SaleRow["payment"];
  subtotal_satang: number;
  discount_satang: number;
  vat_satang: number;
  total_satang: number;
  offline: number;
  void_reason: string | null;
};

const toSaleRow = (r: SaleDbRow): SaleRow => ({
  id: r.id,
  receiptNo: r.receipt_no,
  createdAt: new Date(r.created_at),
  cashier: r.cashier,
  status: r.status,
  payment: r.payment_method,
  subtotalSatang: r.subtotal_satang,
  discountSatang: r.discount_satang,
  vatSatang: r.vat_satang,
  totalSatang: r.total_satang,
  offline: r.offline === 1,
  voidReason: r.void_reason,
});

const SALE_SELECT = `SELECT s.id, s.receipt_no, s.created_at, u.name AS cashier, s.status, s.payment_method,
  s.subtotal_satang, s.discount_satang, s.vat_satang, s.total_satang, s.offline, s.void_reason
  FROM sales s JOIN users u ON u.id = s.cashier_id`;

export async function salesInRange(db: Db, start: Date, end: Date, limit = 200): Promise<SaleRow[]> {
  const { rows } = await db.query<SaleDbRow>(`${SALE_SELECT} WHERE s.created_at >= $1 AND s.created_at < $2 ORDER BY s.created_at DESC LIMIT $3`, [start, end, limit]);
  return rows.map(toSaleRow);
}

export async function saleById(db: Db, id: string) {
  const { rows } = await db.query<SaleDbRow & { shift_id: string; shift_status: string }>(
    `SELECT s.id, s.receipt_no, s.created_at, u.name AS cashier, s.status, s.payment_method,
            s.subtotal_satang, s.discount_satang, s.vat_satang, s.total_satang, s.offline, s.void_reason,
            s.shift_id, sh.status AS shift_status
       FROM sales s
       JOIN users u ON u.id = s.cashier_id
       JOIN shifts sh ON sh.id = s.shift_id
      WHERE s.id = $1`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  const { rows: items } = await db.query<{ name: string; sku: string; qty: number; unit_price_satang: number; line_discount_satang: number; line_total_satang: number }>(
    "SELECT name, sku, qty, unit_price_satang, line_discount_satang, line_total_satang FROM sale_items WHERE sale_id = $1 ORDER BY name",
    [id],
  );
  return {
    sale: toSaleRow(row),
    shiftId: row.shift_id,
    shiftOpen: row.shift_status === "open",
    items: items.map((i) => ({
      name: i.name,
      sku: i.sku,
      qty: Number(i.qty),
      unitPriceSatang: i.unit_price_satang,
      lineDiscountSatang: i.line_discount_satang,
      lineTotalSatang: i.line_total_satang,
    })),
  };
}

export async function rangeSummary(db: Db, start: Date, end: Date) {
  const { rows } = await db.query<{ status: string; payment_method: string; n: number | string; total: number | string | null; vat: number | string | null; discount: number | string | null; offline: number | string | null }>(
    `SELECT status, payment_method, COUNT(*) AS n, SUM(total_satang) AS total, SUM(vat_satang) AS vat, SUM(discount_satang) AS discount, SUM(offline) AS offline
       FROM sales WHERE created_at >= $1 AND created_at < $2 GROUP BY status, payment_method`,
    [start, end],
  );
  const completed = rows.filter((r) => r.status === "completed");
  const sum = (list: typeof rows, key: "n" | "total" | "vat" | "discount" | "offline") => list.reduce((acc, r) => acc + Number(r[key] ?? 0), 0);
  const byPayment: Record<string, { count: number; totalSatang: number }> = {};
  for (const r of completed) byPayment[r.payment_method] = { count: Number(r.n), totalSatang: Number(r.total ?? 0) };
  return {
    count: sum(completed, "n"),
    totalSatang: sum(completed, "total"),
    vatSatang: sum(completed, "vat"),
    discountSatang: sum(completed, "discount"),
    voidedCount: sum(rows.filter((r) => r.status === "voided"), "n"),
    offlineCount: sum(completed, "offline"),
    byPayment,
  };
}

export async function topProducts(db: Db, start: Date, end: Date, limit = 5) {
  const { rows } = await db.query<{ name: string; qty: number | string; total: number | string | null }>(
    `SELECT si.name, SUM(si.qty) AS qty, SUM(si.line_total_satang) AS total
       FROM sale_items si JOIN sales s ON s.id = si.sale_id
      WHERE s.status = 'completed' AND s.created_at >= $1 AND s.created_at < $2
      GROUP BY si.name ORDER BY total DESC LIMIT $3`,
    [start, end, limit],
  );
  return rows.map((r) => ({ name: r.name, qty: Number(r.qty), totalSatang: Number(r.total ?? 0) }));
}

// Daily totals in Bangkok days, bucketed in code so the database needs no time-zone function.
export async function dailyTotals(db: Db, start: Date, end: Date): Promise<Map<string, { count: number; totalSatang: number }>> {
  const { rows } = await db.query<{ created_at: Date; total_satang: number }>(
    "SELECT created_at, total_satang FROM sales WHERE status = 'completed' AND created_at >= $1 AND created_at < $2",
    [start, end],
  );
  const map = new Map<string, { count: number; totalSatang: number }>();
  for (const r of rows) {
    const day = bangkokDate(new Date(r.created_at));
    const cur = map.get(day) ?? { count: 0, totalSatang: 0 };
    cur.count += 1;
    cur.totalSatang += r.total_satang;
    map.set(day, cur);
  }
  return map;
}

export async function lowStock(db: Db, limit = 8) {
  const { rows } = await db.query<{ id: string; name: string; stock_qty: number; low_stock_threshold: number; unit: string }>(
    "SELECT id, name, stock_qty, low_stock_threshold, unit FROM products WHERE active = 1 AND stock_qty <= low_stock_threshold ORDER BY stock_qty, name LIMIT $1",
    [limit],
  );
  return rows.map((r) => ({ id: r.id, name: r.name, stockQty: r.stock_qty, threshold: r.low_stock_threshold, unit: r.unit }));
}

export async function negativeStock(db: Db) {
  const { rows } = await db.query<{ id: string; name: string; stock_qty: number }>("SELECT id, name, stock_qty FROM products WHERE stock_qty < 0 ORDER BY stock_qty");
  return rows.map((r) => ({ id: r.id, name: r.name, stockQty: r.stock_qty }));
}

export async function recentMovements(db: Db, limit = 40) {
  const { rows } = await db.query<{ created_at: Date; product: string; kind: string; qty_change: number; balance_after: number; note: string; actor: string }>(
    `SELECT m.created_at, p.name AS product, m.kind, m.qty_change, m.balance_after, m.note, u.name AS actor
       FROM stock_movements m JOIN products p ON p.id = m.product_id JOIN users u ON u.id = m.actor_id
      ORDER BY m.created_at DESC LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({ at: new Date(r.created_at), product: r.product, kind: r.kind, qtyChange: r.qty_change, balanceAfter: r.balance_after, note: r.note, actor: r.actor }));
}

export async function shiftSales(db: Db, shiftId: string) {
  const { rows } = await db.query<{ n: number | string; total: number | string | null; cash: number | string | null }>(
    `SELECT COUNT(*) AS n, SUM(total_satang) AS total,
            SUM(CASE WHEN payment_method = 'cash' THEN total_satang ELSE 0 END) AS cash
       FROM sales WHERE shift_id = $1 AND status = 'completed'`,
    [shiftId],
  );
  return { count: Number(rows[0].n), totalSatang: Number(rows[0].total ?? 0), cashSatang: Number(rows[0].cash ?? 0) };
}

export async function usersById(db: Db, ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  const { rows } = await db.query<{ id: string; name: string }>(`SELECT id, name FROM users WHERE id IN (${placeholders(ids.length)})`, ids);
  return new Map(rows.map((r) => [r.id, r.name]));
}

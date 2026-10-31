import type { Db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { newId } from "@/lib/ids";

export type MovementKind = "receive" | "sale" | "void" | "adjust";

// Writes one movement row. The balance it records is read right after the product's balance changed.
export async function recordMovement(
  db: Db,
  input: { productId: string; kind: MovementKind; qtyChange: number; actorId: string; refId?: string | null; note?: string },
): Promise<number> {
  const { rows } = await db.query<{ stock_qty: number }>("SELECT stock_qty FROM products WHERE id = $1", [input.productId]);
  const balanceAfter = rows[0].stock_qty;
  await db.query(
    `INSERT INTO stock_movements (id, product_id, kind, qty_change, balance_after, ref_id, note, actor_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [newId(), input.productId, input.kind, input.qtyChange, balanceAfter, input.refId ?? null, input.note ?? "", input.actorId, new Date()],
  );
  return balanceAfter;
}

// Always applies the change, even below zero. Used for receiving, adjusting and voiding.
// Call inside tx().
export async function moveStock(
  db: Db,
  input: { productId: string; kind: MovementKind; qtyChange: number; actorId: string; refId?: string | null; note?: string },
): Promise<number> {
  await db.query("UPDATE products SET stock_qty = stock_qty + $2, updated_at = $3 WHERE id = $1", [
    input.productId,
    input.qtyChange,
    new Date(),
  ]);
  return recordMovement(db, input);
}

export async function receiveStock(db: Db, actorId: string, productId: string, qty: number, note: string): Promise<number> {
  const balance = await moveStock(db, { productId, kind: "receive", qtyChange: qty, actorId, note });
  await audit(db, actorId, "stock.receive", "product", productId, { qty });
  return balance;
}

// An adjustment needs a reason, so the count matches what is on the shelf and the owner can see why.
export async function adjustStock(db: Db, actorId: string, productId: string, delta: number, reason: string): Promise<number> {
  const balance = await moveStock(db, { productId, kind: "adjust", qtyChange: delta, actorId, note: reason });
  await audit(db, actorId, "stock.adjust", "product", productId, { delta, reason });
  return balance;
}

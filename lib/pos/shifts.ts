import type { Db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { newId } from "@/lib/ids";

export type Shift = {
  id: string;
  openedBy: string;
  openedByName: string;
  openedAt: Date;
  openingCashSatang: number;
  status: "open" | "closed";
  closedAt: Date | null;
  closedBy: string | null;
  expectedCashSatang: number | null;
  countedCashSatang: number | null;
  varianceSatang: number | null;
};

const SHIFT_SELECT = `SELECT s.id, s.opened_by, u.name AS opened_by_name, s.opened_at, s.opening_cash_satang, s.status,
  s.closed_at, s.closed_by, s.expected_cash_satang, s.counted_cash_satang, s.variance_satang
  FROM shifts s JOIN users u ON u.id = s.opened_by`;

type ShiftRow = {
  id: string;
  opened_by: string;
  opened_by_name: string;
  opened_at: Date;
  opening_cash_satang: number;
  status: "open" | "closed";
  closed_at: Date | null;
  closed_by: string | null;
  expected_cash_satang: number | null;
  counted_cash_satang: number | null;
  variance_satang: number | null;
};

const toShift = (r: ShiftRow): Shift => ({
  id: r.id,
  openedBy: r.opened_by,
  openedByName: r.opened_by_name,
  openedAt: new Date(r.opened_at),
  openingCashSatang: r.opening_cash_satang,
  status: r.status,
  closedAt: r.closed_at ? new Date(r.closed_at) : null,
  closedBy: r.closed_by,
  expectedCashSatang: r.expected_cash_satang,
  countedCashSatang: r.counted_cash_satang,
  varianceSatang: r.variance_satang,
});

export async function getOpenShift(db: Db): Promise<Shift | null> {
  const { rows } = await db.query<ShiftRow>(`${SHIFT_SELECT} WHERE s.status = 'open' ORDER BY s.opened_at DESC LIMIT 1`);
  return rows[0] ? toShift(rows[0]) : null;
}

export async function getShift(db: Db, id: string): Promise<Shift | null> {
  const { rows } = await db.query<ShiftRow>(`${SHIFT_SELECT} WHERE s.id = $1`, [id]);
  return rows[0] ? toShift(rows[0]) : null;
}

export async function listShifts(db: Db, limit = 30): Promise<Shift[]> {
  const { rows } = await db.query<ShiftRow>(`${SHIFT_SELECT} ORDER BY s.opened_at DESC LIMIT $1`, [limit]);
  return rows.map(toShift);
}

// Returns null when a shift is already open. The caller decides what to tell the user.
export async function openShift(db: Db, actorId: string, openingCashSatang: number): Promise<string | null> {
  if (await getOpenShift(db)) return null;
  const id = newId();
  await db.query(
    "INSERT INTO shifts (id, opened_by, opened_at, opening_cash_satang, status) VALUES ($1, $2, $3, $4, 'open')",
    [id, actorId, new Date(), openingCashSatang],
  );
  await audit(db, actorId, "shift.open", "shift", id, { openingCashSatang });
  return id;
}

// Expected cash = opening cash + cash sales (the change is already netted out) + cash in - cash out.
export async function expectedCash(db: Db, shiftId: string): Promise<number> {
  const shift = await getShift(db, shiftId);
  if (!shift) throw new Error("shift not found");
  const { rows: sales } = await db.query<{ total: number | string | null }>(
    "SELECT SUM(total_satang) AS total FROM sales WHERE shift_id = $1 AND payment_method = 'cash' AND status = 'completed'",
    [shiftId],
  );
  const { rows: cash } = await db.query<{ kind: "in" | "out"; total: number | string | null }>(
    "SELECT kind, SUM(amount_satang) AS total FROM cash_movements WHERE shift_id = $1 GROUP BY kind",
    [shiftId],
  );
  const cashIn = Number(cash.find((c) => c.kind === "in")?.total ?? 0);
  const cashOut = Number(cash.find((c) => c.kind === "out")?.total ?? 0);
  return shift.openingCashSatang + Number(sales[0]?.total ?? 0) + cashIn - cashOut;
}

export async function addCashMovement(db: Db, actorId: string, shiftId: string, kind: "in" | "out", amountSatang: number, reason: string) {
  await db.query(
    "INSERT INTO cash_movements (id, shift_id, kind, amount_satang, reason, actor_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [newId(), shiftId, kind, amountSatang, reason, actorId, new Date()],
  );
  await audit(db, actorId, `shift.cash_${kind}`, "shift", shiftId, { amountSatang, reason });
}

export async function closeShift(db: Db, actorId: string, shiftId: string, countedSatang: number) {
  const expected = await expectedCash(db, shiftId);
  await db.query(
    `UPDATE shifts SET status = 'closed', closed_by = $2, closed_at = $3, expected_cash_satang = $4,
       counted_cash_satang = $5, variance_satang = $6
     WHERE id = $1 AND status = 'open'`,
    [shiftId, actorId, new Date(), expected, countedSatang, countedSatang - expected],
  );
  await audit(db, actorId, "shift.close", "shift", shiftId, { expected, counted: countedSatang, variance: countedSatang - expected });
  return { expected, variance: countedSatang - expected };
}

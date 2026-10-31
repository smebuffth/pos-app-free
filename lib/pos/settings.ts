import type { Db } from "@/lib/db";

export type StoreSettings = {
  name: string;
  address: string;
  taxId: string;
  vatMode: "included" | "none";
  vatBp: number;
  receiptFooter: string;
  promptpayId: string;
  cashierDiscountLimitBp: number;
};

type Row = {
  name: string;
  address: string;
  tax_id: string;
  vat_mode: "included" | "none";
  vat_bp: number;
  receipt_footer: string;
  promptpay_id: string;
  cashier_discount_limit_bp: number;
};

export async function getStoreSettings(db: Db): Promise<StoreSettings> {
  const { rows } = await db.query<Row>(
    "SELECT name, address, tax_id, vat_mode, vat_bp, receipt_footer, promptpay_id, cashier_discount_limit_bp FROM store_settings WHERE id = 1",
  );
  const row = rows[0];
  return {
    name: row.name,
    address: row.address,
    taxId: row.tax_id,
    vatMode: row.vat_mode,
    vatBp: row.vat_bp,
    receiptFooter: row.receipt_footer,
    promptpayId: row.promptpay_id,
    cashierDiscountLimitBp: row.cashier_discount_limit_bp,
  };
}

export async function saveStoreSettings(db: Db, input: StoreSettings): Promise<void> {
  await db.query(
    `UPDATE store_settings
        SET name = $1, address = $2, tax_id = $3, vat_mode = $4, vat_bp = $5, receipt_footer = $6,
            promptpay_id = $7, cashier_discount_limit_bp = $8, updated_at = $9
      WHERE id = 1`,
    [
      input.name,
      input.address,
      input.taxId,
      input.vatMode,
      input.vatBp,
      input.receiptFooter,
      input.promptpayId,
      input.cashierDiscountLimitBp,
      new Date(),
    ],
  );
}

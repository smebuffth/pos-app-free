// Money is INTEGER satang everywhere (THB x 100). Only the UI formats it.
const thb = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" });

export const formatTHB = (satang: number) => thb.format(satang / 100);

// Parses what a cashier types ("1,250.5") into satang. Returns null when it is not a non-negative amount.
export function parseTHB(input: string): number | null {
  const normalized = input.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

// VAT inside a VAT-included price: vat = total * rate / (100 + rate). rateBp is basis points (700 = 7%).
export const vatIncluded = (totalSatang: number, rateBp: number) =>
  Math.round((totalSatang * rateBp) / (10000 + rateBp));

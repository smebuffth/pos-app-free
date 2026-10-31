export type CounterProduct = {
  id: string;
  categoryId: string | null;
  sku: string;
  barcode: string | null;
  name: string;
  unit: string;
  priceSatang: number;
  stockQty: number;
  lowStockThreshold: number;
};

export type CounterCategory = { id: string; name: string };

export type CounterSettings = {
  name: string;
  address: string;
  taxId: string;
  receiptFooter: string;
  promptpayId: string;
  vatMode: "included" | "none";
  vatBp: number;
  cashierDiscountLimitBp: number;
};

export type CartItem = { productId: string; qty: number; discountSatang: number };

export const PAYMENT_LABEL = { cash: "เงินสด", promptpay: "PromptPay", transfer: "โอนเงิน", card: "บัตร" } as const;

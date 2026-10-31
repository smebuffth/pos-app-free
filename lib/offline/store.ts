// Browser storage for offline selling: queued sales (outbox) and a snapshot of the catalogue and settings.
// Client-only. Every call is wrapped by the caller in try/catch, because storage can be blocked.
export type OutboxLine = { productId: string; qty: number; lineDiscountSatang: number; unitPriceSatang: number };

export type OutboxSale = {
  id: string;
  shiftId: string;
  items: OutboxLine[];
  billDiscountSatang: number;
  payment: "cash" | "promptpay" | "transfer" | "card";
  tenderedSatang: number | null;
  clientCreatedAt: string;
  totalSatang: number;
  status: "pending" | "rejected";
  message?: string;
};

export type CatalogSnapshot = {
  savedAt: number;
  products: {
    id: string;
    categoryId: string | null;
    sku: string;
    barcode: string | null;
    name: string;
    unit: string;
    priceSatang: number;
    stockQty: number;
    lowStockThreshold: number;
  }[];
  categories: { id: string; name: string }[];
  settings: {
    name: string;
    address: string;
    taxId: string;
    receiptFooter: string;
    promptpayId: string;
    vatMode: "included" | "none";
    vatBp: number;
    cashierDiscountLimitBp: number;
  };
  role: "owner" | "manager" | "cashier";
};

const DB_NAME = "nisia-pos";
const OUTBOX = "outbox";
const CATALOG = "catalog";

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OUTBOX)) db.createObjectStore(OUTBOX, { keyPath: "id" });
      if (!db.objectStoreNames.contains(CATALOG)) db.createObjectStore(CATALOG, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });
  return dbPromise;
}

async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const putSale = (sale: OutboxSale) => run(OUTBOX, "readwrite", (s) => s.put(sale));
export const deleteSale = (id: string) => run(OUTBOX, "readwrite", (s) => s.delete(id));
export async function listSales(): Promise<OutboxSale[]> {
  const all = await run<OutboxSale[]>(OUTBOX, "readonly", (s) => s.getAll());
  return all.sort((a, b) => a.clientCreatedAt.localeCompare(b.clientCreatedAt));
}

export const putCatalog = (snapshot: CatalogSnapshot) => run(CATALOG, "readwrite", (s) => s.put({ key: "current", ...snapshot }));
export async function getCatalog(): Promise<CatalogSnapshot | null> {
  const row = await run<(CatalogSnapshot & { key: string }) | undefined>(CATALOG, "readonly", (s) => s.get("current"));
  if (!row) return null;
  return { savedAt: row.savedAt, products: row.products, categories: row.categories, settings: row.settings, role: row.role };
}

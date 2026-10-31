import { z } from "zod";
import { withDb } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { requireUserApi } from "@/lib/auth/guards";
import { createSale, SaleError } from "@/lib/pos/sales";

// Sends the offline outbox. Each sale is stored on its own: one rejected sale does not stop the others.
// Per sale the device learns one of: synced, duplicate (already stored), rejected (a rule failed, needs review),
// or retry (a temporary error; keep it in the outbox).
const lineSchema = z.object({
  productId: z.string().min(1).max(64),
  qty: z.number().int().min(1).max(999),
  lineDiscountSatang: z.number().int().min(0).max(1_000_000_000),
  unitPriceSatang: z.number().int().min(0).max(1_000_000_000),
});

const saleSchema = z.object({
  id: z.uuid(),
  shiftId: z.string().min(1).max(64),
  items: z.array(lineSchema).min(1).max(100),
  billDiscountSatang: z.number().int().min(0).max(1_000_000_000),
  payment: z.enum(["cash", "promptpay", "transfer", "card"]),
  tenderedSatang: z.number().int().min(0).max(1_000_000_000).nullable(),
  clientCreatedAt: z.iso.datetime(),
});

const bodySchema = z.object({ sales: z.array(saleSchema).min(1).max(50) });

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUserApi();
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return ok({ results: [], error: "validation_error" }, { status: 400 });

    const results = await withDb(async (db) => {
      const out: { id: string; status: "synced" | "duplicate" | "rejected" | "retry"; receiptNo?: string; code?: string; message?: string }[] = [];
      for (const sale of parsed.data.sales) {
        try {
          const saved = await createSale(db, user, { ...sale, offline: true, clientCreatedAt: new Date(sale.clientCreatedAt) });
          out.push({ id: sale.id, status: saved.duplicate ? "duplicate" : "synced", receiptNo: saved.receiptNo });
        } catch (err) {
          if (err instanceof SaleError) out.push({ id: sale.id, status: "rejected", code: err.code, message: err.message });
          else {
            console.error("sync sale failed", (err as { code?: string }).code ?? "unknown");
            out.push({ id: sale.id, status: "retry" });
          }
        }
      }
      return out;
    });
    return ok({ results });
  });
}

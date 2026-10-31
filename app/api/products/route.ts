import { z } from "zod";
import { connection } from "next/server";
import { withDb } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { requireUserApi } from "@/lib/auth/guards";
import { listCategories, listProducts, findByBarcodeOrSku } from "@/lib/pos/catalog";

// GET /api/products?q=&categoryId=    search the catalogue (the counter and the offline cache use this)
// GET /api/products?code=             one product by barcode or SKU (the scanner uses this)
// GET /api/products?catalog=1         the whole active catalogue with categories (the offline cache)
export async function GET(request: Request) {
  return handle(async () => {
    await connection();
    await requireUserApi();
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (code) {
      const product = await withDb((db) => findByBarcodeOrSku(db, code.slice(0, 64)));
      return ok({ product });
    }
    const parsed = z
      .object({ q: z.string().max(80).optional(), categoryId: z.string().max(64).optional(), catalog: z.string().optional() })
      .safeParse({ q: url.searchParams.get("q") ?? undefined, categoryId: url.searchParams.get("categoryId") ?? undefined, catalog: url.searchParams.get("catalog") ?? undefined });
    if (!parsed.success) return ok({ products: [], categories: [] });
    return withDb(async (db) => {
      const products = await listProducts(db, { q: parsed.data.q, categoryId: parsed.data.categoryId, limit: parsed.data.catalog ? 2000 : 200 });
      const categories = parsed.data.catalog ? await listCategories(db) : [];
      return ok({ products, categories });
    });
  });
}

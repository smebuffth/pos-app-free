import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { withDb } from "@/lib/db";
import { listCategories, listProducts } from "@/lib/pos/catalog";
import { formatTHB } from "@/lib/money";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata = { title: "สินค้า" };

export const instant = false;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  await connection();
  const user = await requireUser();
  const { q, category } = await searchParams;
  const canManage = user.role !== "cashier";
  const { products, categories } = await withDb(async (db) => ({
    products: await listProducts(db, { q: q?.slice(0, 80), categoryId: category, activeOnly: false, limit: 300 }),
    categories: await listCategories(db, false),
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">สินค้า</h1>
          <p className="text-sm text-subtle">{products.length} รายการ</p>
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <Button asChild variant="outline" className="h-11">
              <Link href="/products/categories">หมวดหมู่</Link>
            </Button>
            <Button asChild className="h-11">
              <Link href="/products/new">เพิ่มสินค้า</Link>
            </Button>
          </div>
        ) : null}
      </header>

      <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px_auto]" action="/products">
        <Input name="q" defaultValue={q ?? ""} placeholder="ค้นหาชื่อ รหัส หรือบาร์โค้ด" aria-label="ค้นหาสินค้า" className="h-11" />
        <Autocomplete
          name="category"
          label="หมวดหมู่"
          options={[{ value: "", label: "ทุกหมวดหมู่" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
          defaultValue={category ?? ""}
          placeholder="ทุกหมวดหมู่"
        />
        <Button type="submit" variant="outline" className="h-11">
          ค้นหา
        </Button>
      </form>

      {products.length === 0 ? (
        <p className="py-12 text-center text-subtle">ไม่พบสินค้า</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-tint text-left text-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">ชื่อสินค้า</th>
                <th className="px-4 py-3 font-medium">รหัส</th>
                <th className="px-4 py-3 font-medium">หมวดหมู่</th>
                <th className="px-4 py-3 text-right font-medium">ราคา</th>
                <th className="px-4 py-3 text-right font-medium">สต็อก</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                {canManage ? <th className="px-4 py-3" aria-label="การทำงาน" /> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-fg">{p.name}</td>
                  <td className="px-4 py-3 text-subtle">{p.sku}</td>
                  <td className="px-4 py-3 text-subtle">{p.categoryName ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatTHB(p.priceSatang)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.stockQty < 0 ? <Badge tone="danger">{p.stockQty}</Badge> : p.stockQty <= p.lowStockThreshold ? <Badge tone="warning">{p.stockQty}</Badge> : p.stockQty}
                  </td>
                  <td className="px-4 py-3">{p.active ? <Badge tone="success">ขายอยู่</Badge> : <Badge>ซ่อน</Badge>}</td>
                  {canManage ? (
                    <td className="px-4 py-3 text-right">
                      <Link href={`/products/${p.id}`} className="inline-flex min-h-11 items-center px-3 text-primary-text hover:underline">
                        แก้ไข
                      </Link>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireManager } from "@/lib/auth/guards";
import { withDb } from "@/lib/db";
import { getProduct, listCategories } from "@/lib/pos/catalog";
import { ProductForm } from "@/components/pos/ProductForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "แก้ไขสินค้า" };

export const instant = false;

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  await requireManager();
  const { id } = await params;
  const { product, categories } = await withDb(async (db) => ({
    product: await getProduct(db, id),
    categories: await listCategories(db, false),
  }));
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/products" className="text-sm text-subtle hover:text-fg">
            ← กลับไปรายการสินค้า
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg">{product.name}</h1>
        </div>
        <Link href="/stock" className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm text-fg hover:bg-tint">
          ปรับสต็อก (คงเหลือ {product.stockQty})
        </Link>
      </header>
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>ข้อมูลสินค้า</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm product={product} categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}

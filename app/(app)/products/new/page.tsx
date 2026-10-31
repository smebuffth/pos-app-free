import { connection } from "next/server";
import { requireManager } from "@/lib/auth/guards";
import { withDb } from "@/lib/db";
import { listCategories } from "@/lib/pos/catalog";
import { ProductForm } from "@/components/pos/ProductForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "เพิ่มสินค้า" };

export const instant = false;

export default async function NewProductPage() {
  await connection();
  await requireManager();
  const categories = await withDb((db) => listCategories(db, false));
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">เพิ่มสินค้า</h1>
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>ข้อมูลสินค้า</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}

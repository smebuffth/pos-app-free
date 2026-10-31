import { connection } from "next/server";
import { requireManager } from "@/lib/auth/guards";
import { withDb } from "@/lib/db";
import { listCategories } from "@/lib/pos/catalog";
import { CategoryForms } from "@/components/pos/CategoryForms";

export const metadata = { title: "หมวดหมู่สินค้า" };

export const instant = false;

export default async function CategoriesPage() {
  await connection();
  await requireManager();
  const categories = await withDb((db) => listCategories(db, false));
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">หมวดหมู่สินค้า</h1>
        <p className="text-sm text-subtle">หมวดหมู่ใช้จัดกลุ่มสินค้าบนหน้าขาย</p>
      </header>
      <CategoryForms categories={categories} />
    </div>
  );
}

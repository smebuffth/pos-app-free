import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { withDb } from "@/lib/db";
import { getOpenShift } from "@/lib/pos/shifts";
import { listCategories, listProducts } from "@/lib/pos/catalog";
import { getStoreSettings } from "@/lib/pos/settings";
import { Counter } from "@/components/pos/Counter";
import { Button } from "@/components/ui/button";

export const metadata = { title: "ขาย" };

export const instant = false;

export default async function SalePage() {
  await connection();
  const user = await requireUser();
  const data = await withDb(async (db) => ({
    shift: await getOpenShift(db),
    products: await listProducts(db, { limit: 2000 }),
    categories: await listCategories(db),
    settings: await getStoreSettings(db),
  }));

  if (!data.shift) {
    return (
      <section className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-fg">ยังไม่ได้เปิดกะ</h1>
        <p className="text-subtle">เปิดกะก่อนเริ่มขาย เพื่อให้ยอดเงินสดของกะตรวจได้เมื่อปิดกะ</p>
        <Button asChild size="lg" className="h-12 px-6">
          <Link href="/shifts">ไปเปิดกะ</Link>
        </Button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">ขายหน้าร้าน</h1>
        <p className="text-sm text-subtle">
          กะเปิดโดย {data.shift.openedByName} ตั้งแต่{" "}
          {new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", timeStyle: "short" }).format(data.shift.openedAt)}
        </p>
      </header>
      <Counter
        shiftId={data.shift.id}
        role={user.role}
        cashierName={user.name}
        initialProducts={data.products}
        initialCategories={data.categories}
        settings={{
          name: data.settings.name,
          address: data.settings.address,
          taxId: data.settings.taxId,
          receiptFooter: data.settings.receiptFooter,
          promptpayId: data.settings.promptpayId,
          vatMode: data.settings.vatMode,
          vatBp: data.settings.vatBp,
          cashierDiscountLimitBp: data.settings.cashierDiscountLimitBp,
        }}
      />
    </div>
  );
}

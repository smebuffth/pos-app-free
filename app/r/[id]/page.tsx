import { notFound } from "next/navigation";
import { connection } from "next/server";
import { withDb } from "@/lib/db";
import { getStoreSettings } from "@/lib/pos/settings";
import { saleById } from "@/lib/pos/queries";
import { ReceiptView, type ReceiptData } from "@/components/pos/ReceiptView";
import { PrintButton } from "@/components/pos/PrintButton";

export const instant = false;

export const metadata = { title: "ใบเสร็จ", robots: { index: false, follow: false } };

// Public digital receipt. The sale id is a random UUID, so the link is hard to guess. It shows no customer data.
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const data = await withDb(async (db) => ({ sale: await saleById(db, id), settings: await getStoreSettings(db) }));
  if (!data.sale) notFound();
  const { sale, items } = data.sale;

  const receipt: ReceiptData = {
    receiptNo: sale.receiptNo,
    voided: sale.status === "voided",
    createdAt: sale.createdAt,
    storeName: data.settings.name,
    address: data.settings.address,
    taxId: data.settings.taxId,
    cashier: sale.cashier,
    lines: items.map((i) => ({
      name: i.name,
      qty: i.qty,
      unitPriceSatang: i.unitPriceSatang,
      lineDiscountSatang: i.lineDiscountSatang,
      lineTotalSatang: i.lineTotalSatang,
    })),
    subtotalSatang: sale.subtotalSatang,
    discountSatang: sale.discountSatang,
    totalSatang: sale.totalSatang,
    vatSatang: sale.vatSatang,
    vatMode: data.settings.vatMode,
    payment: sale.payment,
    tenderedSatang: null,
    changeSatang: null,
    footer: data.settings.receiptFooter,
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col gap-4 bg-bg px-4 py-8">
      <ReceiptView data={receipt} />
      <div className="print:hidden">
        <PrintButton />
      </div>
    </main>
  );
}

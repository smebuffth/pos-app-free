import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { withDb } from "@/lib/db";
import { getStoreSettings } from "@/lib/pos/settings";
import { saleById } from "@/lib/pos/queries";
import { ReceiptView, type ReceiptData } from "@/components/pos/ReceiptView";
import { formatTHB } from "@/lib/money";
import { VoidSaleForm } from "@/components/pos/VoidSaleForm";
import { PrintButton } from "@/components/pos/PrintButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "รายละเอียดบิล" };

export const instant = false;

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const user = await requireUser();
  const { id } = await params;
  const data = await withDb(async (db) => {
    const sale = await saleById(db, id);
    const settings = await getStoreSettings(db);
    return { sale, settings };
  });
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

  const canVoid = (user.role === "owner" || user.role === "manager") && sale.status === "completed" && data.sale.shiftOpen;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="space-y-4">
        <Link href="/orders" className="text-sm text-subtle hover:text-fg">
          ← กลับไปรายการบิล
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {sale.receiptNo}
              {sale.status === "voided" ? <Badge tone="danger">ยกเลิกแล้ว</Badge> : <Badge tone="success">สำเร็จ</Badge>}
              {sale.offline ? <Badge tone="warning">ส่งจากออฟไลน์</Badge> : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <dl className="grid grid-cols-2 gap-2">
              <dt className="text-subtle">พนักงาน</dt>
              <dd className="text-right text-fg">{sale.cashier}</dd>
              <dt className="text-subtle">ยอดสุทธิ</dt>
              <dd className="text-right font-semibold text-fg tabular-nums">{formatTHB(sale.totalSatang)}</dd>
              {sale.voidReason ? (
                <>
                  <dt className="text-subtle">เหตุผลที่ยกเลิก</dt>
                  <dd className="text-right text-fg">{sale.voidReason}</dd>
                </>
              ) : null}
            </dl>
            {canVoid ? (
              <div className="border-t border-border pt-4">
                <h2 className="mb-3 text-sm font-semibold text-fg">ยกเลิกบิล</h2>
                <p className="mb-3 text-xs text-subtle">ยกเลิกแล้วสินค้าจะกลับเข้าสต็อก และบิลนี้ไม่นับในยอดขาย</p>
                <VoidSaleForm saleId={sale.id} />
              </div>
            ) : null}
          </CardContent>
        </Card>
        <PrintButton />
      </div>
      <Card className="lg:sticky lg:top-24">
        <CardContent className="p-4">
          <ReceiptView data={receipt} />
        </CardContent>
      </Card>
    </div>
  );
}

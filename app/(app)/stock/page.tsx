import { connection } from "next/server";
import { requireManager } from "@/lib/auth/guards";
import { withDb } from "@/lib/db";
import { listProducts } from "@/lib/pos/catalog";
import { lowStock, negativeStock, recentMovements } from "@/lib/pos/queries";
import { StockForms } from "@/components/pos/StockForms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "สต็อก" };

const KIND_LABEL = { receive: "รับเข้า", sale: "ขาย", void: "คืนจากบิลยกเลิก", adjust: "ปรับ" } as const;

export const instant = false;

export default async function StockPage() {
  await connection();
  await requireManager();
  const data = await withDb(async (db) => ({
    products: await listProducts(db, { limit: 2000 }),
    low: await lowStock(db, 12),
    negative: await negativeStock(db),
    movements: await recentMovements(db, 40),
  }));
  const options = data.products.map((p) => ({ value: p.id, label: p.name, hint: `${p.sku} · คงเหลือ ${p.stockQty}` }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">สต็อก</h1>
        <p className="text-sm text-subtle">รับสินค้าเข้า ปรับตามการนับจริง และดูสินค้าที่ใกล้หมด</p>
      </header>

      {data.negative.length > 0 ? (
        <Card className="border-warning/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ต้องตรวจสอบ <Badge tone="warning">{data.negative.length} รายการ</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-subtle">สต็อกติดลบเกิดจากบิลที่ขายตอนออฟไลน์ ให้นับจริงแล้วปรับสต็อกให้ตรง</p>
            <ul className="divide-y divide-border">
              {data.negative.map((n) => (
                <li key={n.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-fg">{n.name}</span>
                  <Badge tone="danger">{n.stockQty}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>ใกล้หมด</CardTitle>
        </CardHeader>
        <CardContent>
          {data.low.length === 0 ? (
            <p className="text-sm text-subtle">ไม่มีสินค้าที่ต่ำกว่าจุดแจ้งเตือน</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.low.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-fg">{l.name}</span>
                  <span className="text-subtle tabular-nums">
                    คงเหลือ {l.stockQty} {l.unit} (แจ้งเตือนที่ {l.threshold})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <StockForms options={options} />

      <section aria-labelledby="movements" className="space-y-3">
        <h2 id="movements" className="text-base font-semibold text-fg">ความเคลื่อนไหวล่าสุด</h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-tint text-left text-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">เวลา</th>
                <th className="px-4 py-3 font-medium">สินค้า</th>
                <th className="px-4 py-3 font-medium">ประเภท</th>
                <th className="px-4 py-3 text-right font-medium">จำนวน</th>
                <th className="px-4 py-3 text-right font-medium">คงเหลือ</th>
                <th className="px-4 py-3 font-medium">โดย</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.movements.map((m, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 text-subtle">
                    {new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" }).format(m.at)}
                  </td>
                  <td className="px-4 py-2 text-fg">{m.product}</td>
                  <td className="px-4 py-2">{KIND_LABEL[m.kind as keyof typeof KIND_LABEL] ?? m.kind}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${m.qtyChange < 0 ? "text-destructive" : ""}`}>{m.qtyChange > 0 ? `+${m.qtyChange}` : m.qtyChange}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{m.balanceAfter}</td>
                  <td className="px-4 py-2 text-subtle">{m.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

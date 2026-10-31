import { connection } from "next/server";
import { requireOwner } from "@/lib/auth/guards";
import { withDb } from "@/lib/db";
import { buildSnapshot } from "@/lib/ai/assistant";
import { formatTHB } from "@/lib/money";
import { AskPanel } from "@/components/ai/AskPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "ผู้ช่วย AI" };

export const instant = false;

export default async function AssistantPage() {
  await connection();
  await requireOwner();
  const snap = await withDb((db) => buildSnapshot(db));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">ผู้ช่วย AI</h1>
        <p className="text-sm text-subtle">ถามเรื่องยอดขายและสต็อกได้ ส่วนรายการแนะนำสั่งซื้อคำนวณจากยอดขาย 14 วันล่าสุด ไม่ได้มาจาก AI</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
        <AskPanel />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ยอดวันนี้</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-subtle">
                {snap.todaySales.bills} บิล · {formatTHB(Math.round(snap.todaySales.totalBaht * 100))}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                แนะนำสั่งซื้อ <Badge tone="neutral">{snap.reorder.length} รายการ</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {snap.reorder.length === 0 ? (
                <p className="text-sm text-subtle">ยังไม่มีสินค้าที่ต้องสั่งเพิ่มในสัปดาห์นี้</p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {snap.reorder.map((r) => (
                    <li key={r.name} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span className="text-fg">{r.name}</span>
                      <span className="tabular-nums text-subtle">
                        คงเหลือ {r.stockQty} · ขายเฉลี่ย {r.avgPerDay}/วัน · เหลือใช้ ~{r.daysLeft} วัน · สั่ง {r.suggestQty} {r.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

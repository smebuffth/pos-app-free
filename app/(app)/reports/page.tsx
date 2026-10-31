import { connection } from "next/server";
import { requireManager } from "@/lib/auth/guards";
import { withDb } from "@/lib/db";
import { bangkokDate } from "@/lib/ids";
import { addDays, bangkokRange, isYmd } from "@/lib/time";
import { dailyTotals, negativeStock, rangeSummary, topProducts } from "@/lib/pos/queries";
import { formatTHB } from "@/lib/money";
import { PAYMENT_LABEL } from "@/components/pos/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata = { title: "รายงาน" };

export const instant = false;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await connection();
  await requireManager();
  const params = await searchParams;
  const today = bangkokDate();
  const to = params.to && isYmd(params.to) ? params.to : today;
  const from = params.from && isYmd(params.from) && params.from <= to ? params.from : addDays(to, -6);
  const { start, end } = bangkokRange(from, to);

  const data = await withDb(async (db) => ({
    summary: await rangeSummary(db, start, end),
    top: await topProducts(db, start, end, 10),
    daily: await dailyTotals(db, start, end),
    negative: await negativeStock(db),
  }));

  const days: string[] = [];
  for (let d = from; d <= to && days.length < 366; d = addDays(d, 1)) days.push(d);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">รายงานการขาย</h1>
          <p className="text-sm text-subtle">
            {from} ถึง {to} (เวลาประเทศไทย)
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form className="flex flex-wrap items-end gap-2" action="/reports">
            <div className="space-y-1">
              <label htmlFor="from" className="text-sm text-subtle">
                ตั้งแต่
              </label>
              <Input id="from" name="from" type="date" defaultValue={from} className="h-11" />
            </div>
            <div className="space-y-1">
              <label htmlFor="to" className="text-sm text-subtle">
                ถึง
              </label>
              <Input id="to" name="to" type="date" defaultValue={to} className="h-11" />
            </div>
            <Button type="submit" variant="outline" className="h-11">
              แสดง
            </Button>
          </form>
          <Button asChild className="h-11">
            <a href={`/api/reports/export?from=${from}&to=${to}`}>ดาวน์โหลด CSV</a>
          </Button>
        </div>
      </header>

      <section aria-label="สรุป" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="ยอดขายสุทธิ" value={formatTHB(data.summary.totalSatang)} />
        <Stat label="จำนวนบิล" value={`${data.summary.count} บิล`} />
        <Stat label="ส่วนลดรวม" value={formatTHB(data.summary.discountSatang)} />
        <Stat label="VAT ในยอด" value={formatTHB(data.summary.vatSatang)} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>แยกตามวิธีชำระ</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">
              {(Object.keys(PAYMENT_LABEL) as (keyof typeof PAYMENT_LABEL)[]).map((key) => {
                const row = data.summary.byPayment[key];
                return (
                  <li key={key} className="flex items-center justify-between py-2">
                    <span className="text-fg">{PAYMENT_LABEL[key]}</span>
                    <span className="tabular-nums text-subtle">
                      {row ? `${row.count} บิล · ${formatTHB(row.totalSatang)}` : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <Badge tone="danger">ยกเลิก {data.summary.voidedCount} บิล</Badge>
              <Badge tone="warning">ส่งจากออฟไลน์ {data.summary.offlineCount} บิล</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>สินค้าขายดี</CardTitle>
          </CardHeader>
          <CardContent>
            {data.top.length === 0 ? (
              <p className="text-sm text-subtle">ยังไม่มียอดขายในช่วงนี้</p>
            ) : (
              <ol className="divide-y divide-border text-sm">
                {data.top.map((t, i) => (
                  <li key={t.name} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate text-fg">
                      {i + 1}. {t.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-subtle">
                      {t.qty} ชิ้น · {formatTHB(t.totalSatang)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {data.negative.length > 0 ? (
        <Card className="border-warning/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              สต็อกติดลบ <Badge tone="warning">{data.negative.length} รายการ</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">
              {data.negative.map((n) => (
                <li key={n.id} className="flex items-center justify-between py-2">
                  <span className="text-fg">{n.name}</span>
                  <span className="tabular-nums text-destructive">{n.stockQty}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <section aria-labelledby="daily" className="space-y-3">
        <h2 id="daily" className="text-base font-semibold text-fg">ยอดรายวัน</h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="bg-tint text-left text-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">วันที่</th>
                <th className="px-4 py-3 text-right font-medium">บิล</th>
                <th className="px-4 py-3 text-right font-medium">ยอดสุทธิ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {days.map((day) => {
                const row = data.daily.get(day);
                return (
                  <tr key={day}>
                    <td className="px-4 py-2 text-fg">{day}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{row?.count ?? 0}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{row ? formatTHB(row.totalSatang) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-bg p-4">
      <p className="text-xs text-subtle">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-fg">{value}</p>
    </div>
  );
}

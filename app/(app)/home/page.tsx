import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { withDb } from "@/lib/db";
import { bangkokDate } from "@/lib/ids";
import { addDays, bangkokRange } from "@/lib/time";
import { getOpenShift } from "@/lib/pos/shifts";
import { dailyTotals, lowStock, rangeSummary, salesInRange, topProducts } from "@/lib/pos/queries";
import { formatTHB } from "@/lib/money";
import { PAYMENT_LABEL } from "@/components/pos/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, ScanBarcode, Warehouse, BarChart3 } from "lucide-react";

export const metadata = { title: "หน้าหลัก" };

const timeTH = (d: Date) => new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", timeStyle: "short" }).format(d);
const dayTH = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
};

export const instant = false;

export default async function HomePage() {
  await connection();
  const user = await requireUser();
  const today = bangkokDate();
  const { start, end } = bangkokRange(today, today);
  const weekStart = bangkokRange(addDays(today, -6), today).start;

  const data = await withDb(async (db) => {
    const shift = await getOpenShift(db);
    const summary = await rangeSummary(db, start, end);
    const top = await topProducts(db, start, end, 5);
    const recent = await salesInRange(db, start, end, 6);
    const week = await dailyTotals(db, weekStart, end);
    const low = await lowStock(db, 5);
    const { rows } = await db.query<{ qty: number | string | null }>(
      `SELECT SUM(si.qty) AS qty FROM sale_items si JOIN sales s ON s.id = si.sale_id
        WHERE s.status = 'completed' AND s.created_at >= $1 AND s.created_at < $2`,
      [start, end],
    );
    return { shift, summary, top, recent, week, low, itemsSold: Number(rows[0]?.qty ?? 0) };
  });

  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const weekMax = Math.max(1, ...days.map((d) => data.week.get(d)?.totalSatang ?? 0));
  const greeting = user.role === "cashier" ? "พร้อมขายแล้ว" : "สวัสดี";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-subtle">{dayTH(today)}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {greeting}, {user.name}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button asChild className="h-11">
            <Link href="/sale">
              <ShoppingCart aria-hidden />
              เปิดหน้าขาย
            </Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          {data.shift ? (
            <>
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-base font-semibold text-fg">
                  กะเปิดอยู่ <Badge tone="success">เปิดอยู่</Badge>
                </p>
                <p className="text-sm text-subtle">
                  เปิดโดย {data.shift.openedByName} เมื่อ {timeTH(data.shift.openedAt)}
                </p>
              </div>
              <Button asChild variant="outline" className="h-11">
                <Link href="/shifts">ดูกะ / ปิดกะ</Link>
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-base font-semibold text-fg">ยังไม่ได้เปิดกะ</p>
                <p className="text-sm text-subtle">เปิดกะก่อนเริ่มขาย</p>
              </div>
              <Button asChild className="h-11">
                <Link href="/shifts">เปิดกะ</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <section aria-label="ตัวเลขวันนี้" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="ยอดขายวันนี้" value={formatTHB(data.summary.totalSatang)} />
        <Stat label="จำนวนบิล" value={`${data.summary.count} บิล`} />
        <Stat label="ชิ้นที่ขายได้" value={`${data.itemsSold} ชิ้น`} />
        <Stat label="ใกล้หมด" value={`${data.low.length} รายการ`} warn={data.low.length > 0} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>ยอดขาย 7 วันล่าสุด</CardTitle>
          </CardHeader>
          <CardContent>
            <div role="img" aria-label="กราฟยอดขาย 7 วันล่าสุด" className="flex h-44 items-end gap-2">
              {days.map((d) => {
                const value = data.week.get(d)?.totalSatang ?? 0;
                const height = Math.max(4, Math.round((value / weekMax) * 100));
                return (
                  <div key={d} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <div className="w-full rounded-t-md bg-primary/80" style={{ height: `${height}%` }} title={formatTHB(value)} />
                    <span className="text-[0.7rem] text-subtle">{dayTH(d)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ทางลัด</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Quick href="/sale" icon={ShoppingCart} label="ขาย" />
            <Quick href="/sale" icon={ScanBarcode} label="สแกนขาย" />
            {user.role !== "cashier" ? <Quick href="/stock" icon={Warehouse} label="สต็อก" /> : <Quick href="/orders" icon={BarChart3} label="บิลวันนี้" />}
            {user.role !== "cashier" ? <Quick href="/reports" icon={BarChart3} label="รายงาน" /> : <Quick href="/shifts" icon={BarChart3} label="กะ" />}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>บิลล่าสุดวันนี้</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent.length === 0 ? (
              <p className="text-sm text-subtle">ยังไม่มีบิลวันนี้</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {data.recent.map((s) => (
                  <li key={s.id}>
                    <Link href={`/orders/${s.id}`} className="flex min-h-11 items-center justify-between gap-3 hover:underline">
                      <span className="min-w-0 truncate text-fg">
                        {s.receiptNo} · {timeTH(s.createdAt)} · {PAYMENT_LABEL[s.payment]}
                      </span>
                      <span className={`shrink-0 tabular-nums ${s.status === "voided" ? "text-subtle line-through" : "text-fg"}`}>{formatTHB(s.totalSatang)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>สินค้าขายดีวันนี้</CardTitle>
          </CardHeader>
          <CardContent>
            {data.top.length === 0 ? (
              <p className="text-sm text-subtle">ยังไม่มียอดขายวันนี้</p>
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
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-bg p-4">
      <p className="text-xs text-subtle">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${warn ? "text-warning" : "text-fg"}`}>{value}</p>
    </div>
  );
}

function Quick({ href, icon: Icon, label }: { href: string; icon: typeof ShoppingCart; label: string }) {
  return (
    <Link href={href} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium text-fg hover:bg-tint">
      <Icon className="size-5 text-primary-text" aria-hidden />
      {label}
    </Link>
  );
}

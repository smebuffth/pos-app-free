import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { withDb } from "@/lib/db";
import { bangkokRange, isYmd, addDays } from "@/lib/time";
import { bangkokDate } from "@/lib/ids";
import { salesInRange } from "@/lib/pos/queries";
import { formatTHB } from "@/lib/money";
import { PAYMENT_LABEL } from "@/components/pos/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = { title: "บิลการขาย" };

export const instant = false;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await connection();
  await requireUser();
  const { date } = await searchParams;
  const day = date && isYmd(date) ? date : bangkokDate();
  const { start, end } = bangkokRange(day, day);
  const sales = await withDb((db) => salesInRange(db, start, end, 300));
  const total = sales.filter((s) => s.status === "completed").reduce((sum, s) => sum + s.totalSatang, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">บิลการขาย</h1>
          <p className="text-sm text-subtle">
            {sales.length} บิล · ยอดสำเร็จ {formatTHB(total)}
          </p>
        </div>
        <form className="flex items-end gap-2" action="/orders">
          <div className="space-y-1">
            <label htmlFor="date" className="text-sm text-subtle">
              วันที่
            </label>
            <Input id="date" name="date" type="date" defaultValue={day} className="h-11" />
          </div>
          <Button type="submit" variant="outline" className="h-11">
            ดูวันนี้
          </Button>
        </form>
      </header>

      <nav aria-label="เปลี่ยนวัน" className="flex gap-2 text-sm">
        <Link href={`/orders?date=${addDays(day, -1)}`} className="min-h-11 rounded-full border border-border px-4 leading-[2.75rem] text-fg hover:bg-tint">
          ← วันก่อน
        </Link>
        <Link href={`/orders?date=${addDays(day, 1)}`} className="min-h-11 rounded-full border border-border px-4 leading-[2.75rem] text-fg hover:bg-tint">
          วันถัดไป →
        </Link>
      </nav>

      {sales.length === 0 ? (
        <p className="py-12 text-center text-subtle">ไม่มีบิลในวันนี้</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {sales.map((s) => (
            <li key={s.id}>
              <Link href={`/orders/${s.id}`} className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 hover:bg-tint">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-fg">{s.receiptNo}</span>
                  <span className="block text-xs text-subtle">
                    {new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", timeStyle: "short" }).format(s.createdAt)} · {s.cashier} ·{" "}
                    {PAYMENT_LABEL[s.payment]}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  {s.offline ? <Badge tone="warning">ออฟไลน์</Badge> : null}
                  {s.status === "voided" ? <Badge tone="danger">ยกเลิก</Badge> : null}
                  <span className={`text-sm font-semibold tabular-nums ${s.status === "voided" ? "text-subtle line-through" : "text-fg"}`}>
                    {formatTHB(s.totalSatang)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

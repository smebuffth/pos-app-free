import { connection } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { withDb } from "@/lib/db";
import { expectedCash, getOpenShift, listShifts } from "@/lib/pos/shifts";
import { shiftSales, usersById } from "@/lib/pos/queries";
import { formatTHB } from "@/lib/money";
import { OpenShiftForm, CashMovementForm, CloseShiftForm } from "@/components/pos/ShiftForms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "กะการขาย" };

const timeTH = (d: Date) => new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" }).format(d);

export const instant = false;

export default async function ShiftsPage() {
  await connection();
  await requireUser();
  const data = await withDb(async (db) => {
    const open = await getOpenShift(db);
    const history = await listShifts(db, 20);
    const sales = open ? await shiftSales(db, open.id) : null;
    const expected = open ? await expectedCash(db, open.id) : null;
    return { open, history, sales, expected };
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">กะการขาย</h1>
        <p className="text-sm text-subtle">เปิดกะก่อนขาย และปิดกะเมื่อหมดเวลางาน ระบบจะเทียบเงินสดในลิ้นชักให้</p>
      </header>

      {data.open && data.sales && data.expected !== null ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                กะที่เปิดอยู่ <Badge tone="success">เปิดอยู่</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <dt className="text-subtle">เปิดโดย</dt>
                <dd className="text-right text-fg">{data.open.openedByName}</dd>
                <dt className="text-subtle">เปิดเมื่อ</dt>
                <dd className="text-right text-fg">{timeTH(data.open.openedAt)}</dd>
                <dt className="text-subtle">เงินทอนตั้งต้น</dt>
                <dd className="text-right tabular-nums text-fg">{formatTHB(data.open.openingCashSatang)}</dd>
                <dt className="text-subtle">บิลในกะ</dt>
                <dd className="text-right tabular-nums text-fg">{data.sales.count} บิล</dd>
                <dt className="text-subtle">ยอดขายในกะ</dt>
                <dd className="text-right tabular-nums text-fg">{formatTHB(data.sales.totalSatang)}</dd>
                <dt className="text-subtle">คาดว่ามีเงินสดตอนนี้</dt>
                <dd className="text-right font-semibold tabular-nums text-fg">{formatTHB(data.expected)}</dd>
              </dl>
            </CardContent>
          </Card>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>เงินเข้า-ออกระหว่างกะ</CardTitle>
              </CardHeader>
              <CardContent>
                <CashMovementForm />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>ปิดกะ</CardTitle>
              </CardHeader>
              <CardContent>
                <CloseShiftForm expectedSatang={data.expected} />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>ยังไม่มีกะที่เปิดอยู่</CardTitle>
          </CardHeader>
          <CardContent>
            <OpenShiftForm />
          </CardContent>
        </Card>
      )}

      <section aria-labelledby="history" className="space-y-3">
        <h2 id="history" className="text-base font-semibold text-fg">ประวัติกะล่าสุด</h2>
        <ShiftHistory history={data.history} />
      </section>
    </div>
  );
}

async function ShiftHistory({ history }: { history: Awaited<ReturnType<typeof listShifts>> }) {
  if (history.length === 0) return <p className="text-sm text-subtle">ยังไม่มีประวัติกะ</p>;
  const names = await withDb((db) => usersById(db, history.flatMap((s) => (s.closedBy ? [s.closedBy] : []))));
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-tint text-left text-subtle">
          <tr>
            <th className="px-4 py-3 font-medium">เปิด</th>
            <th className="px-4 py-3 font-medium">ปิด</th>
            <th className="px-4 py-3 text-right font-medium">เงินตั้งต้น</th>
            <th className="px-4 py-3 text-right font-medium">คาดว่ามี</th>
            <th className="px-4 py-3 text-right font-medium">นับได้</th>
            <th className="px-4 py-3 text-right font-medium">ส่วนต่าง</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {history.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3 text-fg">
                {timeTH(s.openedAt)} <span className="text-subtle">{s.openedByName}</span>
              </td>
              <td className="px-4 py-3 text-fg">
                {s.status === "open" ? <Badge tone="success">เปิดอยู่</Badge> : s.closedAt ? timeTH(s.closedAt) : "—"}
                {s.closedBy && names.get(s.closedBy) ? <span className="ml-2 text-subtle">{names.get(s.closedBy)}</span> : null}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{formatTHB(s.openingCashSatang)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{s.expectedCashSatang !== null ? formatTHB(s.expectedCashSatang) : "—"}</td>
              <td className="px-4 py-3 text-right tabular-nums">{s.countedCashSatang !== null ? formatTHB(s.countedCashSatang) : "—"}</td>
              <td className={`px-4 py-3 text-right tabular-nums ${s.varianceSatang && s.varianceSatang !== 0 ? "font-semibold text-warning" : ""}`}>
                {s.varianceSatang !== null ? formatTHB(s.varianceSatang) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

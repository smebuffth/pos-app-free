import { connection } from "next/server";
import { requireOwner } from "@/lib/auth/guards";
import { withDb } from "@/lib/db";
import { StaffCreateForm, StaffRowForm } from "@/components/pos/StaffForms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "พนักงาน" };

const ROLE_LABEL = { owner: "เจ้าของร้าน", manager: "ผู้จัดการ", cashier: "แคชเชียร์" } as const;

export const instant = false;

export default async function StaffPage() {
  await connection();
  const me = await requireOwner();
  const staff = await withDb(async (db) => {
    const { rows } = await db.query<{ id: string; name: string; email: string; role: "owner" | "manager" | "cashier"; active: number }>(
      "SELECT id, name, email, role, active FROM users ORDER BY created_at",
    );
    return rows;
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">พนักงาน</h1>
        <p className="text-sm text-subtle">เจ้าของร้านเพิ่มพนักงานและกำหนดตำแหน่ง ไม่มีการสมัครสมาชิกเอง</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>รายชื่อ</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {staff.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">
                    {s.name} {s.id === me.id ? <span className="text-subtle">(คุณ)</span> : null}
                  </p>
                  <p className="truncate text-xs text-subtle">{s.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={s.role === "owner" ? "primary" : "neutral"}>{ROLE_LABEL[s.role]}</Badge>
                  {s.active !== 1 ? <Badge tone="danger">ระงับ</Badge> : null}
                  <StaffRowForm id={s.id} role={s.role} active={s.active === 1} isOwner={s.role === "owner" || s.id === me.id} />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>เพิ่มพนักงาน</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffCreateForm />
        </CardContent>
      </Card>
    </div>
  );
}

import { connection } from "next/server";
import { requireOwner } from "@/lib/auth/guards";
import { withDb } from "@/lib/db";
import { readAiSettings } from "@/lib/ai/settings";
import { AiSettingsForm } from "@/components/ai/AiSettingsForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "เชื่อมต่อ AI" };

export const instant = false;

export default async function AiSettingsPage() {
  await connection();
  const owner = await requireOwner();
  const view = await withDb((db) => readAiSettings(db, owner.id));
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">เชื่อมต่อ AI</h1>
        <p className="text-sm text-subtle">ใช้คีย์ของคุณเอง ระบบเก็บคีย์แบบเข้ารหัส และไม่แสดงคีย์กลับมาอีก AI ไม่สามารถแก้ข้อมูลในร้านได้</p>
      </header>
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>ตั้งค่าผู้ให้บริการ</CardTitle>
        </CardHeader>
        <CardContent>
          <AiSettingsForm initial={view} />
        </CardContent>
      </Card>
    </div>
  );
}

import { connection } from "next/server";
import { requireOwner } from "@/lib/auth/guards";
import { withDb } from "@/lib/db";
import { getStoreSettings } from "@/lib/pos/settings";
import { StoreSettingsForm } from "@/components/pos/StoreSettingsForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "ตั้งค่าร้าน" };

export const instant = false;

export default async function SettingsPage() {
  await connection();
  await requireOwner();
  const settings = await withDb((db) => getStoreSettings(db));
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">ตั้งค่าร้าน</h1>
        <p className="text-sm text-subtle">ข้อมูลเหล่านี้ใช้บนใบเสร็จและ QR PromptPay</p>
      </header>
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>ข้อมูลร้าน</CardTitle>
        </CardHeader>
        <CardContent>
          <StoreSettingsForm settings={settings} />
        </CardContent>
      </Card>
    </div>
  );
}

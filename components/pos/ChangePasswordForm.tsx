"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current">รหัสผ่านปัจจุบัน</Label>
        <Input id="current" name="current" type="password" autoComplete="current-password" required className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="next">รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</Label>
        <Input id="next" name="next" type="password" autoComplete="new-password" required minLength={8} className="h-11" />
      </div>
      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error.message}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="text-sm text-success">
          เปลี่ยนรหัสผ่านแล้ว อุปกรณ์อื่นที่ลงชื่อเข้าใช้จะถูกออกจากระบบ
        </p>
      ) : null}
      <Button type="submit" variant="outline" className="h-11" disabled={pending}>
        {pending ? "กำลังบันทึก…" : "เปลี่ยนรหัสผ่าน"}
      </Button>
    </form>
  );
}

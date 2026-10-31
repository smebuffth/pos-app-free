"use client";

import { useActionState } from "react";
import { setupOwnerAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SetupForm() {
  const [state, action, pending] = useActionState(setupOwnerAction, undefined);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">ชื่อเจ้าของร้าน</Label>
        <Input id="name" name="name" autoComplete="name" required maxLength={80} className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">อีเมล</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="h-11" />
      </div>
      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error.message}
        </p>
      ) : null}
      <Button type="submit" className="h-12 w-full text-base" disabled={pending}>
        {pending ? "กำลังสร้างบัญชี…" : "สร้างบัญชีเจ้าของร้าน"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { createStaffAction, updateStaffAction } from "@/app/actions/auth";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLE_OPTIONS = [
  { value: "cashier", label: "แคชเชียร์" },
  { value: "manager", label: "ผู้จัดการ" },
];

export function StaffCreateForm() {
  const [state, action, pending] = useActionState(createStaffAction, undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="staff-name">ชื่อ</Label>
        <Input id="staff-name" name="name" required maxLength={80} className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="staff-email">อีเมล (ใช้เข้าสู่ระบบ)</Label>
        <Input id="staff-email" name="email" type="email" required className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="staff-password">รหัสผ่านเริ่มต้น (อย่างน้อย 8 ตัวอักษร)</Label>
        <Input id="staff-password" name="password" type="password" autoComplete="new-password" required minLength={8} className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="staff-role">ตำแหน่ง</Label>
        <Autocomplete id="staff-role" name="role" label="ตำแหน่ง" searchable={false} options={ROLE_OPTIONS} defaultValue="cashier" />
      </div>
      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {state.error.message}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="text-sm text-success sm:col-span-2">
          เพิ่มพนักงานแล้ว ให้พนักงานเปลี่ยนรหัสผ่านที่หน้าฉัน
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <Button type="submit" className="h-11" disabled={pending}>
          {pending ? "กำลังเพิ่ม…" : "เพิ่มพนักงาน"}
        </Button>
      </div>
    </form>
  );
}

export function StaffRowForm({ id, role, active, isOwner }: { id: string; role: "owner" | "manager" | "cashier"; active: boolean; isOwner: boolean }) {
  const [state, action, pending] = useActionState(updateStaffAction, undefined);
  if (isOwner) return <p className="text-sm text-subtle">เจ้าของร้าน</p>;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Autocomplete name="role" label="ตำแหน่ง" searchable={false} options={ROLE_OPTIONS} defaultValue={role} className="w-36" />
      <Autocomplete
        name="active"
        label="สถานะ"
        searchable={false}
        options={[
          { value: "1", label: "ใช้งาน" },
          { value: "0", label: "ระงับ" },
        ]}
        defaultValue={active ? "1" : "0"}
        className="w-28"
      />
      <Button type="submit" variant="outline" className="h-11" disabled={pending}>
        บันทึก
      </Button>
      {state && !state.ok ? <span role="alert" className="text-sm text-destructive">{state.error.message}</span> : null}
    </form>
  );
}

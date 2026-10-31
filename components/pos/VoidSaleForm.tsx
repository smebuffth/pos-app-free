"use client";

import { useActionState } from "react";
import { voidSaleAction } from "@/app/actions/sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VoidSaleForm({ saleId }: { saleId: string }) {
  const [state, action, pending] = useActionState(voidSaleAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="saleId" value={saleId} />
      <div className="space-y-2">
        <Label htmlFor="reason">เหตุผลในการยกเลิกบิล</Label>
        <Input id="reason" name="reason" required minLength={3} maxLength={200} placeholder="เช่น ลูกค้าขอคืนสินค้า" className="h-11" />
      </div>
      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error.message}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="text-sm text-fg">
          ยกเลิกบิลแล้ว และคืนสินค้าเข้าสต็อก
        </p>
      ) : null}
      <Button type="submit" variant="destructive" className="h-11" disabled={pending}>
        {pending ? "กำลังยกเลิก…" : "ยกเลิกบิลนี้"}
      </Button>
    </form>
  );
}

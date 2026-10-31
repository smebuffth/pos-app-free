"use client";

import { useActionState } from "react";
import { adjustStockAction, receiveStockAction } from "@/app/actions/catalog";
import { Autocomplete, type AutocompleteOption } from "@/components/ui/autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StockForms({ options }: { options: AutocompleteOption[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ReceiveForm options={options} />
      <AdjustForm options={options} />
    </div>
  );
}

function ReceiveForm({ options }: { options: AutocompleteOption[] }) {
  const [state, action, pending] = useActionState(receiveStockAction, undefined);
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-border p-5">
      <h2 className="text-base font-semibold text-fg">รับสินค้าเข้า</h2>
      <div className="space-y-2">
        <Label htmlFor="receive-product">สินค้า</Label>
        <Autocomplete name="productId" label="สินค้าที่รับเข้า" options={options} placeholder="พิมพ์ชื่อหรือรหัส" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="receive-qty">จำนวน</Label>
          <Input id="receive-qty" name="qty" inputMode="numeric" required className="h-11 text-right tabular-nums" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="receive-note">หมายเหตุ</Label>
          <Input id="receive-note" name="note" maxLength={200} placeholder="เลขที่ใบส่งของ" className="h-11" />
        </div>
      </div>
      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error.message}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="text-sm text-success">
          รับสินค้าเข้าแล้ว
        </p>
      ) : null}
      <Button type="submit" className="h-11" disabled={pending}>
        {pending ? "กำลังบันทึก…" : "บันทึกรับเข้า"}
      </Button>
    </form>
  );
}

function AdjustForm({ options }: { options: AutocompleteOption[] }) {
  const [state, action, pending] = useActionState(adjustStockAction, undefined);
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-border p-5">
      <h2 className="text-base font-semibold text-fg">ปรับสต็อกตามการนับจริง</h2>
      <div className="space-y-2">
        <Label htmlFor="adjust-product">สินค้า</Label>
        <Autocomplete name="productId" label="สินค้าที่ปรับ" options={options} placeholder="พิมพ์ชื่อหรือรหัส" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="adjust-delta">ปรับจำนวน (+ เพิ่ม / − ลด)</Label>
          <Input id="adjust-delta" name="delta" inputMode="numeric" required className="h-11 text-right tabular-nums" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adjust-reason">เหตุผล</Label>
          <Input id="adjust-reason" name="reason" required maxLength={200} placeholder="เช่น นับจริงแล้วขาด" className="h-11" />
        </div>
      </div>
      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error.message}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="text-sm text-success">
          ปรับสต็อกแล้ว
        </p>
      ) : null}
      <Button type="submit" variant="outline" className="h-11" disabled={pending}>
        {pending ? "กำลังบันทึก…" : "บันทึกการปรับ"}
      </Button>
    </form>
  );
}

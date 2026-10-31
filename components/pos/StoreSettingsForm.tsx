"use client";

import { useActionState } from "react";
import { saveSettingsAction } from "@/app/actions/settings";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StoreSettings } from "@/lib/pos/settings";

export function StoreSettingsForm({ settings }: { settings: StoreSettings }) {
  const [state, action, pending] = useActionState(saveSettingsAction, undefined);
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="name">ชื่อร้าน (แสดงบนใบเสร็จ)</Label>
        <Input id="name" name="name" required maxLength={120} defaultValue={settings.name} className="h-11" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="address">ที่อยู่ร้าน</Label>
        <Input id="address" name="address" maxLength={300} defaultValue={settings.address} className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="taxId">เลขผู้เสียภาษี</Label>
        <Input id="taxId" name="taxId" inputMode="numeric" maxLength={20} defaultValue={settings.taxId} className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="promptpayId">เลข PromptPay (มือถือ / เลขนิติบุคคล)</Label>
        <Input id="promptpayId" name="promptpayId" inputMode="numeric" maxLength={20} defaultValue={settings.promptpayId} className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vatMode">VAT</Label>
        <Autocomplete
          id="vatMode"
          name="vatMode"
          label="VAT"
          searchable={false}
          options={[
            { value: "included", label: "ราคารวม VAT แล้ว" },
            { value: "none", label: "ไม่คิด VAT" },
          ]}
          defaultValue={settings.vatMode}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="vatPercent">อัตรา VAT (%)</Label>
        <Input id="vatPercent" name="vatPercent" inputMode="decimal" defaultValue={(settings.vatBp / 100).toString()} className="h-11 text-right tabular-nums" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="discountLimitPercent">ส่วนลดสูงสุดที่พนักงานให้ได้ (%)</Label>
        <Input
          id="discountLimitPercent"
          name="discountLimitPercent"
          inputMode="decimal"
          defaultValue={(settings.cashierDiscountLimitBp / 100).toString()}
          className="h-11 text-right tabular-nums"
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="receiptFooter">ข้อความท้ายใบเสร็จ</Label>
        <Input id="receiptFooter" name="receiptFooter" maxLength={200} defaultValue={settings.receiptFooter} className="h-11" />
      </div>
      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {state.error.message}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="text-sm text-success sm:col-span-2">
          บันทึกการตั้งค่าแล้ว
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" className="h-12 px-8" disabled={pending}>
          {pending ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
        </Button>
      </div>
    </form>
  );
}

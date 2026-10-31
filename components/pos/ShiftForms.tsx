"use client";

import { useActionState, useState } from "react";
import { closeShiftAction, cashMovementAction, openShiftAction } from "@/app/actions/shifts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTHB } from "@/lib/money";
import type { Result } from "@/lib/http";

function Message({ state }: { state: Result<unknown> | undefined }) {
  if (!state) return null;
  return state.ok ? null : (
    <p role="alert" className="text-sm text-destructive">
      {state.error.message}
    </p>
  );
}

export function OpenShiftForm() {
  const [state, action, pending] = useActionState(openShiftAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="openingBaht">เงินทอนตั้งต้นในลิ้นชัก (บาท)</Label>
        <Input id="openingBaht" name="openingBaht" inputMode="decimal" required defaultValue="0" className="h-12 text-right text-lg tabular-nums" />
      </div>
      <Message state={state} />
      <Button type="submit" size="lg" className="h-12 w-full" disabled={pending}>
        {pending ? "กำลังเปิดกะ…" : "เปิดกะ"}
      </Button>
    </form>
  );
}

export function CashMovementForm() {
  const [state, action, pending] = useActionState(cashMovementAction, undefined);
  const [kind, setKind] = useState<"in" | "out">("out");
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      <div role="radiogroup" aria-label="ประเภท" className="grid grid-cols-2 gap-2">
        {(
          [
            ["out", "เงินออก"],
            ["in", "เงินเข้า"],
          ] as const
        ).map(([value, text]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={kind === value}
            onClick={() => setKind(value)}
            className={`min-h-11 rounded-xl border text-sm font-medium ${kind === value ? "border-primary bg-primary/10 text-primary-text" : "border-border text-fg"}`}
          >
            {text}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amountBaht">จำนวน (บาท)</Label>
          <Input id="amountBaht" name="amountBaht" inputMode="decimal" required className="h-11 text-right tabular-nums" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reason">เหตุผล</Label>
          <Input id="reason" name="reason" required maxLength={120} placeholder="เช่น ซื้อน้ำแข็ง" className="h-11" />
        </div>
      </div>
      <Message state={state} />
      <Button type="submit" variant="outline" className="h-11" disabled={pending}>
        {pending ? "กำลังบันทึก…" : "บันทึกรายการเงิน"}
      </Button>
    </form>
  );
}

export function CloseShiftForm({ expectedSatang }: { expectedSatang: number }) {
  const [state, action, pending] = useActionState(closeShiftAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-subtle">
        ระบบคาดว่ามีเงินสดในลิ้นชัก <span className="font-semibold text-fg tabular-nums">{formatTHB(expectedSatang)}</span>
      </p>
      <div className="space-y-2">
        <Label htmlFor="countedBaht">เงินสดที่นับได้จริง (บาท)</Label>
        <Input id="countedBaht" name="countedBaht" inputMode="decimal" required className="h-12 text-right text-lg tabular-nums" />
      </div>
      <Message state={state} />
      {state?.ok ? (
        <p role="status" className="rounded-xl bg-tint p-3 text-sm text-fg">
          ปิดกะแล้ว ส่วนต่าง {formatTHB(state.data.variance)}
        </p>
      ) : null}
      <Button type="submit" size="lg" variant="destructive" className="h-12 w-full" disabled={pending}>
        {pending ? "กำลังปิดกะ…" : "ปิดกะ"}
      </Button>
    </form>
  );
}

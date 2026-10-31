"use client";

import { useState } from "react";
import { Banknote, CreditCard, QrCode, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatTHB, parseTHB } from "@/lib/money";
import { PromptPayQr } from "@/components/pos/PromptPayQr";
import type { CounterSettings } from "@/components/pos/types";

type Method = "cash" | "promptpay" | "transfer" | "card";

const METHODS: { id: Method; label: string; icon: typeof Banknote }[] = [
  { id: "cash", label: "เงินสด", icon: Banknote },
  { id: "promptpay", label: "PromptPay", icon: QrCode },
  { id: "transfer", label: "โอนเงิน", icon: Smartphone },
  { id: "card", label: "บัตร", icon: CreditCard },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalSatang: number;
  settings: CounterSettings;
  busy: boolean;
  error: string | null;
  onConfirm: (method: Method, tenderedSatang: number | null) => void;
};

// Cash: the tendered amount and the change. PromptPay: the QR for the exact total. Transfer and card: recorded as taken.
export function PaymentDialog({ open, onOpenChange, totalSatang, settings, busy, error, onConfirm }: Props) {
  const [method, setMethod] = useState<Method>("cash");
  const [tenderedText, setTenderedText] = useState("");
  const tendered = tenderedText.trim() === "" ? null : parseTHB(tenderedText);
  const change = method === "cash" && tendered !== null ? tendered - totalSatang : null;
  const cashShort = method === "cash" && (tendered === null || tendered < totalSatang);

  const addCash = (baht: number) => setTenderedText(String(((tendered ?? 0) / 100 + baht).toFixed(2)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ชำระเงิน</DialogTitle>
          <DialogDescription>ยอดที่ต้องชำระ {formatTHB(totalSatang)}</DialogDescription>
        </DialogHeader>

        <div role="radiogroup" aria-label="วิธีชำระเงิน" className="grid grid-cols-4 gap-2">
          {METHODS.map((m) => {
            const Icon = m.icon;
            const active = method === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setMethod(m.id)}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-medium transition-colors ${
                  active ? "border-primary bg-primary/10 text-primary-text" : "border-border text-fg hover:bg-tint"
                }`}
              >
                <Icon className="size-5" aria-hidden />
                {m.label}
              </button>
            );
          })}
        </div>

        {method === "cash" ? (
          <div className="space-y-3">
            <label className="block space-y-2">
              <span className="text-sm text-subtle">รับเงินมา (บาท)</span>
              <Input
                inputMode="decimal"
                value={tenderedText}
                onChange={(e) => setTenderedText(e.target.value)}
                className="h-14 text-right text-2xl tabular-nums"
                autoFocus
              />
            </label>
            <div className="grid grid-cols-4 gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={() => setTenderedText((totalSatang / 100).toFixed(2))}>
                พอดี
              </Button>
              {[100, 500, 1000].map((v) => (
                <Button key={v} type="button" variant="outline" className="h-11" onClick={() => addCash(v)}>
                  +{v}
                </Button>
              ))}
            </div>
            <div className="flex items-baseline justify-between rounded-xl bg-tint p-3">
              <span className="text-sm text-subtle">เงินทอน</span>
              <span className={`text-xl font-semibold tabular-nums ${cashShort ? "text-subtle" : "text-fg"}`}>
                {change !== null && change >= 0 ? formatTHB(change) : "—"}
              </span>
            </div>
          </div>
        ) : null}

        {method === "promptpay" ? <PromptPayQr target={settings.promptpayId} amountSatang={totalSatang} /> : null}

        {method === "transfer" || method === "card" ? (
          <p className="rounded-xl bg-tint p-3 text-sm text-subtle">บันทึกว่าลูกค้าชำระด้วย{method === "transfer" ? "การโอนเงิน" : "บัตร"} ยอด {formatTHB(totalSatang)}</p>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            size="lg"
            className="h-14 w-full text-base"
            disabled={busy || (method === "cash" && cashShort)}
            onClick={() => onConfirm(method, method === "cash" ? tendered : null)}
          >
            {busy ? "กำลังบันทึก…" : method === "promptpay" ? "ลูกค้าชำระแล้ว" : "ยืนยันการรับเงิน"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTHB, parseTHB } from "@/lib/money";

export type CartRow = {
  productId: string;
  name: string;
  unit: string;
  priceSatang: number;
  qty: number;
  discountSatang: number;
  grossSatang: number;
  lineTotalSatang: number;
};

type Props = {
  rows: CartRow[];
  billDiscountSatang: number;
  onBillDiscount: (satang: number) => void;
  onQty: (productId: string, qty: number) => void;
  onLineDiscount: (productId: string, satang: number) => void;
  onRemove: (productId: string) => void;
  subtotalSatang: number;
  discountSatang: number;
  totalSatang: number;
  vatMode: "included" | "none";
  vatSatang: number;
  needsManager: boolean;
  onCheckout: () => void;
};

// The cart. Quantities and discounts are typed or tapped; every amount is recomputed from the rows.
export function CartPanel(props: Props) {
  const count = props.rows.reduce((sum, r) => sum + r.qty, 0);
  return (
    <section aria-label="บิลปัจจุบัน" className="flex min-h-0 flex-col gap-4 rounded-2xl border border-border bg-tint p-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-fg">บิลปัจจุบัน</h2>
        <span className="text-sm text-subtle">{count} ชิ้น</span>
      </header>

      {props.rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-subtle">ยังไม่มีสินค้าในบิล เลือกสินค้าจากรายการด้านซ้าย</p>
      ) : (
        <ul className="divide-y divide-border">
          {props.rows.map((row) => (
            <CartLine key={row.productId} row={row} {...props} />
          ))}
        </ul>
      )}

      <div className="space-y-2 border-t border-border pt-4 text-sm">
        <Totals label="รวม" value={formatTHB(props.subtotalSatang)} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-subtle">ส่วนลดทั้งบิล (บาท)</span>
          <BahtField label="ส่วนลดทั้งบิล" satang={props.billDiscountSatang} onCommit={props.onBillDiscount} className="w-32" />
        </div>
        {props.discountSatang > 0 ? <Totals label="ส่วนลดรวม" value={`-${formatTHB(props.discountSatang)}`} /> : null}
        {props.needsManager ? (
          <p role="alert" className="rounded-lg bg-warning/10 p-2 text-sm text-warning">
            ส่วนลดเกินวงเงินของพนักงาน ต้องให้ผู้จัดการหรือเจ้าของเข้าสู่ระบบจึงทำรายการได้
          </p>
        ) : null}
        <div className="flex items-baseline justify-between border-t border-border pt-3">
          <span className="text-base font-semibold text-fg">ยอดสุทธิ</span>
          <span className="text-2xl font-semibold text-fg" aria-live="polite">
            {formatTHB(props.totalSatang)}
          </span>
        </div>
        {props.vatMode === "included" ? <p className="text-right text-xs text-subtle">รวม VAT {formatTHB(props.vatSatang)}</p> : null}
      </div>

      <Button type="button" size="lg" className="h-14 text-base" disabled={props.rows.length === 0} onClick={props.onCheckout}>
        ชำระเงิน {props.rows.length > 0 ? formatTHB(props.totalSatang) : ""}
      </Button>
    </section>
  );
}

function CartLine({ row, onQty, onLineDiscount, onRemove }: Props & { row: CartRow }) {
  return (
    <li className="space-y-2 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-fg">{row.name}</p>
          <p className="text-xs text-subtle">
            {formatTHB(row.priceSatang)} / {row.unit}
          </p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-fg">{formatTHB(row.lineTotalSatang)}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1" role="group" aria-label={`จำนวน ${row.name}`}>
          <Button type="button" variant="outline" size="icon" className="size-11" onClick={() => onQty(row.productId, row.qty - 1)} aria-label="ลดจำนวน">
            <Minus aria-hidden />
          </Button>
          <span className="w-10 text-center text-base font-semibold tabular-nums" aria-live="polite">
            {row.qty}
          </span>
          <Button type="button" variant="outline" size="icon" className="size-11" onClick={() => onQty(row.productId, row.qty + 1)} aria-label="เพิ่มจำนวน">
            <Plus aria-hidden />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <BahtField label={`ส่วนลดของ ${row.name}`} satang={row.discountSatang} onCommit={(s) => onLineDiscount(row.productId, s)} className="w-24" />
          <Button type="button" variant="ghost" size="icon" className="size-11 text-destructive" onClick={() => onRemove(row.productId)} aria-label={`ลบ ${row.name}`}>
            <Trash2 aria-hidden />
          </Button>
        </div>
      </div>
    </li>
  );
}

function Totals({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-subtle">{label}</span>
      <span className="text-fg">{value}</span>
    </div>
  );
}

// Money typed in baht. The value is committed on blur or Enter, and only a valid amount is kept.
export function BahtField({ label, satang, onCommit, className }: { label: string; satang: number; onCommit: (satang: number) => void; className?: string }) {
  const [text, setText] = useState(satang ? (satang / 100).toFixed(2) : "");
  const [lastSatang, setLastSatang] = useState(satang);
  if (satang !== lastSatang) {
    setLastSatang(satang);
    setText(satang ? (satang / 100).toFixed(2) : "");
  }
  const commit = () => {
    const parsed = text.trim() === "" ? 0 : parseTHB(text);
    if (parsed === null) {
      setText(satang ? (satang / 100).toFixed(2) : "");
      return;
    }
    onCommit(parsed);
  };
  return (
    <Input
      aria-label={label}
      inputMode="decimal"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
      placeholder="0.00"
      className={`h-11 text-right tabular-nums ${className ?? ""}`}
    />
  );
}

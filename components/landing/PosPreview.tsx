import type { ReactNode } from "react";
import { Banknote, Coffee, CreditCard, Croissant, CupSoda, QrCode, TrendingUp, WifiOff } from "lucide-react";

const CART = [
  { name: "ลาเต้เย็น", qty: 2, price: "฿110" },
  { name: "ครัวซองต์เนย", qty: 1, price: "฿65" },
  { name: "น้ำแร่", qty: 1, price: "฿15" },
];

const TILES = [
  { icon: Coffee, name: "ลาเต้เย็น", price: "฿55", tone: "bg-primary/10 text-primary" },
  { icon: Croissant, name: "ครัวซองต์", price: "฿65", tone: "bg-amber-100 text-amber-700" },
  { icon: CupSoda, name: "น้ำแร่", price: "฿15", tone: "bg-sky-100 text-sky-700" },
];

const WEEK = [38, 52, 45, 64, 58, 80, 72];

// A drawing of the sale screen for the hero. Decorative: the same facts are in the text around it, so it is hidden
// from assistive technology.
export function PosPreview() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-xl select-none">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-primary/15 via-sky/15 to-transparent blur-2xl" />

      {/* The till */}
      <div className="overflow-hidden rounded-2xl border border-border bg-bg shadow-[0_24px_60px_-20px_rgba(29,78,216,0.35)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-red-300" />
            <span className="size-2.5 rounded-full bg-amber-300" />
            <span className="size-2.5 rounded-full bg-emerald-300" />
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[0.7rem] font-medium text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            กะเปิดอยู่
          </span>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-[1.1fr_1fr]">
          <div className="space-y-3">
            <div className="h-9 rounded-lg border border-border bg-tint" />
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-2">
              {TILES.map(({ icon: Icon, name, price, tone }) => (
                <div key={name} className="rounded-xl border border-border p-2.5">
                  <span className={`mb-2 flex size-9 items-center justify-center rounded-lg ${tone}`}>
                    <Icon className="size-4.5" />
                  </span>
                  <p className="truncate text-xs font-medium text-fg">{name}</p>
                  <p className="text-xs text-subtle">{price}</p>
                </div>
              ))}
              <div className="hidden rounded-xl border border-dashed border-border sm:block" />
            </div>
          </div>

          <div className="flex flex-col rounded-xl bg-tint p-3">
            <ul className="space-y-2 text-xs">
              {CART.map((line) => (
                <li key={line.name} className="flex items-center justify-between gap-2">
                  <span className="truncate text-fg">
                    {line.name} <span className="text-subtle">×{line.qty}</span>
                  </span>
                  <span className="font-medium tabular-nums text-fg">{line.price}</span>
                </li>
              ))}
            </ul>
            <div className="my-3 border-t border-dashed border-border" />
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-subtle">รวม</span>
              <span className="text-xl font-semibold tabular-nums text-fg">฿190</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <PayChip icon={<Banknote className="size-4" />} label="เงินสด" />
              <PayChip icon={<QrCode className="size-4" />} label="PromptPay" active />
              <PayChip icon={<CreditCard className="size-4" />} label="บัตร" />
            </div>
            <div className="mt-3 rounded-lg bg-primary py-2.5 text-center text-sm font-semibold text-primary-fg">รับเงิน ฿190</div>
          </div>
        </div>
      </div>

      {/* Today's sales, floating over the top-right corner */}
      <div className="absolute -top-6 -right-2 hidden w-44 rounded-xl border border-border bg-bg p-3 shadow-lg sm:block lg:-right-8">
        <p className="text-[0.7rem] text-subtle">ยอดขายวันนี้</p>
        <p className="flex items-center gap-1.5 text-base font-semibold tabular-nums text-fg">
          ฿12,480 <TrendingUp className="size-4 text-emerald-600" />
        </p>
        <div className="mt-2 flex h-10 items-end gap-1">
          {WEEK.map((h, i) => (
            <span
              key={i}
              className={`flex-1 rounded-sm ${i === WEEK.length - 1 ? "bg-primary" : "bg-primary/25"}`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>

      {/* Offline queue, floating under the bottom-left corner */}
      <div className="absolute -bottom-5 -left-2 hidden items-center gap-2.5 rounded-xl border border-border bg-bg px-3 py-2.5 shadow-lg sm:flex lg:-left-8">
        <span className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <WifiOff className="size-4" />
        </span>
        <div>
          <p className="text-xs font-medium text-fg">ออฟไลน์อยู่ ขายต่อได้</p>
          <p className="text-[0.7rem] text-subtle">3 บิลรอส่งเมื่อกลับมาออนไลน์</p>
        </div>
      </div>
    </div>
  );
}

function PayChip({ icon, label, active }: { icon: ReactNode; label: string; active?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-lg border py-1.5 text-[0.65rem] ${
        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-bg text-subtle"
      }`}
    >
      {icon}
      {label}
    </div>
  );
}

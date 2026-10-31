"use client";

import { ScanBarcode, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTHB } from "@/lib/money";
import type { CounterCategory, CounterProduct } from "@/components/pos/types";

type Props = {
  products: CounterProduct[];
  categories: CounterCategory[];
  categoryId: string | null;
  onCategory: (id: string | null) => void;
  query: string;
  onQuery: (value: string) => void;
  onPick: (productId: string) => void;
  onSubmitCode: () => void;
  onScan: () => void;
};

// Search and barcode entry sit on one row. A hardware scanner types the code and presses Enter.
export function ProductGrid({ products, categories, categoryId, onCategory, query, onQuery, onPick, onSubmitCode, onScan }: Props) {
  return (
    <section aria-label="สินค้า" className="flex min-w-0 flex-col gap-4">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-subtle" aria-hidden />
          <Input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSubmitCode();
              }
            }}
            placeholder="ค้นหาชื่อ รหัส หรือยิงบาร์โค้ด"
            aria-label="ค้นหาสินค้า"
            className="h-12 pl-10 text-base"
            autoComplete="off"
          />
        </div>
        <Button type="button" variant="outline" className="h-12 px-4" onClick={onScan} aria-label="สแกนด้วยกล้อง">
          <ScanBarcode className="size-5" aria-hidden />
          <span className="hidden sm:inline">สแกน</span>
        </Button>
      </div>

      <div role="group" aria-label="หมวดหมู่" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
        <CategoryChip active={categoryId === null} onClick={() => onCategory(null)}>
          ทั้งหมด
        </CategoryChip>
        {categories.map((c) => (
          <CategoryChip key={c.id} active={categoryId === c.id} onClick={() => onCategory(c.id)}>
            {c.name}
          </CategoryChip>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="py-12 text-center text-subtle">ไม่พบสินค้า</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(p.id)}
                className="flex min-h-36 w-full flex-col justify-between gap-3 rounded-xl border border-border bg-bg p-3 text-left shadow-xs transition-colors hover:border-primary/40 hover:bg-tint active:scale-[0.99] lg:min-h-40"
              >
                <span className="line-clamp-2 text-sm leading-normal font-medium text-fg">{p.name}</span>
                <span className="flex items-end justify-between gap-2">
                  <span className="text-base font-semibold text-fg">{formatTHB(p.priceSatang)}</span>
                  {p.stockQty <= p.lowStockThreshold ? (
                    <Badge tone={p.stockQty <= 0 ? "danger" : "warning"}>เหลือ {p.stockQty}</Badge>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CategoryChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-medium transition-colors ${
        active ? "bg-primary text-primary-fg" : "bg-secondary text-secondary-foreground hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

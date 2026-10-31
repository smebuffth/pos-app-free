"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Printer, Link2 } from "lucide-react";
import { checkoutAction } from "@/app/actions/sales";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { CartPanel, type CartRow } from "@/components/pos/CartPanel";
import { PaymentDialog } from "@/components/pos/PaymentDialog";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";
import { ReceiptView, type ReceiptData } from "@/components/pos/ReceiptView";
import type { CartItem, CounterCategory, CounterProduct, CounterSettings } from "@/components/pos/types";
import { PAYMENT_LABEL } from "@/components/pos/types";
import { formatTHB, vatIncluded } from "@/lib/money";
import { queueSale } from "@/lib/offline/outbox";
import { getCatalog, putCatalog } from "@/lib/offline/store";
import type { OutboxSale } from "@/lib/offline/store";

type Props = {
  shiftId: string;
  role: "owner" | "manager" | "cashier";
  cashierName: string;
  initialProducts: CounterProduct[];
  initialCategories: CounterCategory[];
  settings: CounterSettings;
};

type Method = keyof typeof PAYMENT_LABEL;

// The counter. Prices and stock come from the catalogue on this device. Online sales are priced and checked on the
// server. Offline sales are queued with the same id and sent when the connection returns.
export function Counter({ shiftId, role, cashierName, initialProducts, initialCategories, settings }: Props) {
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [online, setOnline] = useState(true);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [billDiscount, setBillDiscount] = useState(0);
  const [payOpen, setPayOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [receipt, setReceipt] = useState<{ data: ReceiptData; saleId: string; sharable: boolean } | null>(null);

  // The catalogue is refreshed when the page opens and kept on the device for offline selling.
  useEffect(() => {
    let cancelled = false;
    const apply = (next: { products: CounterProduct[]; categories: CounterCategory[] }) => {
      if (cancelled) return;
      setProducts(next.products);
      setCategories(next.categories);
    };
    const load = async () => {
      const isOnline = navigator.onLine;
      setOnline(isOnline);
      if (isOnline) {
        try {
          const res = await fetch("/api/products?catalog=1", { cache: "no-store" });
          const body = (await res.json()) as { ok: boolean; data?: { products: CounterProduct[]; categories: CounterCategory[] } };
          if (body.ok && body.data) {
            apply(body.data);
            await putCatalog({
              savedAt: Date.now(),
              products: body.data.products,
              categories: body.data.categories,
              settings,
              role,
            });
            return;
          }
        } catch {
          // Offline or a failed request: fall back to the saved copy below.
        }
      }
      try {
        const saved = await getCatalog();
        if (saved) apply({ products: saved.products as CounterProduct[], categories: saved.categories });
      } catch {
        // Storage is blocked: the server-rendered list stays on screen.
      }
    };
    void load();
    const goOnline = () => {
      setOnline(true);
      void load();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [settings, role]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryId && p.categoryId !== categoryId) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.barcode ?? "").toLowerCase().includes(q);
    });
  }, [products, query, categoryId]);

  const rows: CartRow[] = useMemo(
    () =>
      cart.flatMap((item) => {
        const p = byId.get(item.productId);
        if (!p) return [];
        const gross = p.priceSatang * item.qty;
        return [
          {
            productId: p.id,
            name: p.name,
            unit: p.unit,
            priceSatang: p.priceSatang,
            qty: item.qty,
            discountSatang: item.discountSatang,
            grossSatang: gross,
            lineTotalSatang: gross - item.discountSatang,
          },
        ];
      }),
    [cart, byId],
  );

  const grossSubtotal = rows.reduce((sum, r) => sum + r.grossSatang, 0);
  const lineDiscount = rows.reduce((sum, r) => sum + r.discountSatang, 0);
  const subtotal = grossSubtotal - lineDiscount;
  const discountTotal = Math.min(lineDiscount + billDiscount, grossSubtotal);
  const total = Math.max(subtotal - billDiscount, 0);
  const vat = settings.vatMode === "included" ? vatIncluded(total, settings.vatBp) : 0;
  const needsManager = discountTotal > 0 && grossSubtotal > 0 && discountTotal * 10000 > grossSubtotal * settings.cashierDiscountLimitBp;
  const managerBlocked = needsManager && role === "cashier";

  const addProduct = (productId: string) => {
    setNotice(null);
    setCart((current) => {
      const found = current.find((c) => c.productId === productId);
      if (found) return current.map((c) => (c.productId === productId ? { ...c, qty: c.qty + 1 } : c));
      return [...current, { productId, qty: 1, discountSatang: 0 }];
    });
  };

  const setQty = (productId: string, qty: number) => {
    if (qty <= 0) return setCart((current) => current.filter((c) => c.productId !== productId));
    setCart((current) => current.map((c) => (c.productId === productId ? { ...c, qty: Math.min(qty, 999) } : c)));
  };

  const setLineDiscount = (productId: string, satang: number) => {
    setCart((current) => current.map((c) => (c.productId === productId ? { ...c, discountSatang: Math.min(satang, c.qty * (byId.get(productId)?.priceSatang ?? 0)) } : c)));
  };

  // Finds one product by barcode or SKU: first on this device, then on the server when online.
  const findCode = async (code: string) => {
    const value = code.trim();
    if (!value) return;
    const local = products.find((p) => p.barcode === value || p.sku === value);
    if (local) {
      addProduct(local.id);
      setQuery("");
      return;
    }
    if (!online) return setNotice(`ไม่พบสินค้า ${value} บนเครื่องนี้`);
    try {
      const res = await fetch(`/api/products?code=${encodeURIComponent(value)}`, { cache: "no-store" });
      const body = (await res.json()) as { ok: boolean; data?: { product: CounterProduct | null } };
      if (body.ok && body.data?.product) {
        const found = body.data.product;
        setProducts((current) => (current.some((p) => p.id === found.id) ? current : [...current, found]));
        addProduct(found.id);
        setQuery("");
      } else {
        setNotice(`ไม่พบสินค้า ${value}`);
      }
    } catch {
      setNotice(`ค้นหา ${value} ไม่ได้ ลองใหม่อีกครั้ง`);
    }
  };

  const submitSearch = () => {
    const q = query.trim();
    const exact = products.find((p) => p.barcode === q || p.sku === q);
    if (exact) {
      addProduct(exact.id);
      setQuery("");
    } else if (q && /^\d{6,}$/.test(q)) {
      void findCode(q);
    }
  };

  const confirmPayment = async (method: Method, tenderedSatang: number | null) => {
    setPayError(null);
    if (rows.length === 0) return;
    if (managerBlocked) {
      setPayError("ส่วนลดเกินวงเงินของพนักงาน ให้ผู้จัดการหรือเจ้าของทำรายการ");
      return;
    }
    if (method === "cash" && (tenderedSatang === null || tenderedSatang < total)) {
      setPayError("รับเงินไม่พอ");
      return;
    }
    setBusy(true);
    const saleId = crypto.randomUUID();
    const clientCreatedAt = new Date();
    const lines = rows.map((r) => ({ productId: r.productId, qty: r.qty, lineDiscountSatang: r.discountSatang }));
    const changeSatang = method === "cash" && tenderedSatang !== null ? tenderedSatang - total : null;
    const reviewLines = rows.map((r) => ({
      name: r.name,
      qty: r.qty,
      unitPriceSatang: r.priceSatang,
      lineDiscountSatang: r.discountSatang,
      lineTotalSatang: r.lineTotalSatang,
    }));
    const baseReceipt = {
      createdAt: clientCreatedAt,
      storeName: settings.name,
      address: settings.address,
      taxId: settings.taxId,
      cashier: cashierName,
      lines: reviewLines,
      subtotalSatang: subtotal,
      discountSatang: discountTotal,
      totalSatang: total,
      vatSatang: vat,
      vatMode: settings.vatMode,
      payment: method,
      tenderedSatang: method === "cash" ? tenderedSatang : null,
      changeSatang,
      footer: settings.receiptFooter,
    } satisfies Omit<ReceiptData, "receiptNo">;

    const queueOffline = async () => {
      const sale: OutboxSale = {
        id: saleId,
        shiftId,
        items: rows.map((r) => ({ productId: r.productId, qty: r.qty, lineDiscountSatang: r.discountSatang, unitPriceSatang: r.priceSatang })),
        billDiscountSatang: billDiscount,
        payment: method,
        tenderedSatang: method === "cash" ? tenderedSatang : null,
        clientCreatedAt: clientCreatedAt.toISOString(),
        totalSatang: total,
        status: "pending",
      };
      await queueSale(sale);
      setReceipt({ data: { ...baseReceipt, receiptNo: "รอซิงก์", pending: true }, saleId, sharable: false });
      finishSale();
    };

    const finishSale = () => {
      setCart([]);
      setBillDiscount(0);
      setPayOpen(false);
      setBusy(false);
    };

    try {
      if (!navigator.onLine) throw new Error("offline");
      const result = await checkoutAction({
        id: saleId,
        shiftId,
        items: lines,
        billDiscountSatang: billDiscount,
        payment: method,
        tenderedSatang: method === "cash" ? tenderedSatang : null,
      });
      if (!result.ok) {
        setPayError(result.error.message);
        setBusy(false);
        return;
      }
      setReceipt({
        data: { ...baseReceipt, receiptNo: result.data.receiptNo, changeSatang: result.data.changeSatang },
        saleId,
        sharable: true,
      });
      finishSale();
    } catch {
      // The request did not reach the server, or the response was lost. The same sale id is queued, so the
      // server stores it at most once.
      try {
        await queueOffline();
      } catch {
        setPayError("บันทึกบิลไม่ได้ ลองอีกครั้ง");
        setBusy(false);
      }
    }
  };

  const shareUrl = receipt?.sharable ? `${window.location.origin}/r/${receipt.saleId}` : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <ProductGrid
        products={visibleProducts}
        categories={categories}
        categoryId={categoryId}
        onCategory={setCategoryId}
        query={query}
        onQuery={setQuery}
        onPick={addProduct}
        onSubmitCode={submitSearch}
        onScan={() => setScanOpen(true)}
      />

      <div id="cart" className="space-y-4 lg:sticky lg:top-24">
        {notice ? (
          <p role="status" className="rounded-xl bg-warning/10 p-3 text-sm text-warning">
            {notice}
          </p>
        ) : null}
        {!online ? <p className="rounded-xl bg-tint p-3 text-sm text-subtle">ออฟไลน์: บิลจะถูกเก็บไว้และส่งเมื่อกลับมาออนไลน์</p> : null}
        <CartPanel
          rows={rows}
          billDiscountSatang={billDiscount}
          onBillDiscount={setBillDiscount}
          onQty={setQty}
          onLineDiscount={setLineDiscount}
          onRemove={(id) => setQty(id, 0)}
          subtotalSatang={subtotal}
          discountSatang={discountTotal}
          totalSatang={total}
          vatMode={settings.vatMode}
          vatSatang={vat}
          needsManager={needsManager}
          onCheckout={() => {
            setPayError(null);
            setPayOpen(true);
          }}
        />
      </div>

      <a
        href="#cart"
        className="fixed inset-x-4 bottom-20 z-20 flex min-h-14 items-center justify-between rounded-2xl bg-primary px-5 text-primary-fg shadow-lg lg:hidden"
        hidden={rows.length === 0}
      >
        <span className="text-sm">{rows.reduce((s, r) => s + r.qty, 0)} ชิ้น</span>
        <span className="text-base font-semibold">{formatTHB(total)}</span>
      </a>

      <PaymentDialog
        open={payOpen}
        onOpenChange={(open) => {
          if (!busy) setPayOpen(open);
        }}
        totalSatang={total}
        settings={settings}
        busy={busy}
        error={payError}
        onConfirm={confirmPayment}
      />

      <BarcodeScanner open={scanOpen} onOpenChange={setScanOpen} onCode={(code) => void findCode(code)} />

      <Dialog open={receipt !== null} onOpenChange={(open) => !open && setReceipt(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-success" aria-hidden />
              {receipt?.data.pending ? "บันทึกบิลแล้ว รอซิงก์" : "ขายสำเร็จ"}
            </DialogTitle>
            <DialogDescription>
              {receipt?.data.pending ? "บิลนี้จะส่งเข้าระบบเมื่อกลับมาออนไลน์" : `เลขที่ใบเสร็จ ${receipt?.data.receiptNo ?? ""}`}
            </DialogDescription>
          </DialogHeader>
          {receipt ? <ReceiptView data={receipt.data} /> : null}
          <DialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" className="h-12" onClick={() => window.print()}>
              <Printer aria-hidden />
              พิมพ์
            </Button>
            {receipt?.sharable ? (
              <Button
                type="button"
                variant="outline"
                className="h-12"
                onClick={() => void navigator.clipboard?.writeText(shareUrl)}
              >
                <Link2 aria-hidden />
                คัดลอกลิงก์
              </Button>
            ) : null}
            <Button type="button" className="col-span-full h-12" onClick={() => setReceipt(null)}>
              ขายต่อ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteSale, listSales, putSale, type OutboxSale } from "@/lib/offline/store";
import { flushOutbox } from "@/lib/offline/outbox";
import { formatTHB } from "@/lib/money";

// Sales made offline that are waiting to be sent, or were refused by a rule and need a person to decide.
export function SyncReview() {
  const [sales, setSales] = useState<OutboxSale[] | null>(null);

  const refresh = useCallback(() => {
    listSales().then(setSales, () => setSales([]));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("nisia-outbox-changed", refresh);
    return () => window.removeEventListener("nisia-outbox-changed", refresh);
  }, [refresh]);

  if (sales === null) return <p className="text-sm text-subtle">กำลังโหลด…</p>;
  if (sales.length === 0) return <p className="py-12 text-center text-subtle">ไม่มีบิลที่รอซิงก์หรือต้องตรวจสอบ</p>;

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
      {sales.map((sale) => (
        <li key={sale.id} className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">
                บิลออฟไลน์ · {formatTHB(sale.totalSatang)} · {sale.items.length} รายการ
              </p>
              <p className="text-xs text-subtle">{new Date(sale.clientCreatedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</p>
            </div>
            {sale.status === "rejected" ? <Badge tone="danger">ต้องตรวจสอบ</Badge> : <Badge tone="primary">รอซิงก์</Badge>}
          </div>
          {sale.message ? <p className="text-sm text-destructive">{sale.message}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={async () => {
                await putSale({ ...sale, status: "pending", message: undefined });
                await flushOutbox();
                await refresh();
              }}
            >
              ลองส่งอีกครั้ง
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 text-destructive"
              onClick={async () => {
                if (!window.confirm("ลบบิลนี้ออกจากคิวบนเครื่องนี้? ระบบจะไม่บันทึกบิลนี้ลงฐานข้อมูล")) return;
                await deleteSale(sale.id);
                await refresh();
              }}
            >
              ลบบิลนี้
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

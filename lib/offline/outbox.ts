"use client";

import { deleteSale, listSales, putSale, type OutboxSale } from "@/lib/offline/store";

export const OUTBOX_EVENT = "nisia-outbox-changed";

const notify = () => window.dispatchEvent(new Event(OUTBOX_EVENT));

// Queues a sale for sync. The sale keeps the id the device generated, so a retry never stores it twice.
export async function queueSale(sale: OutboxSale): Promise<void> {
  await putSale({ ...sale, status: "pending" });
  notify();
  void flushOutbox();
}

type SyncResult = { id: string; status: "synced" | "duplicate" | "rejected" | "retry"; code?: string; message?: string };

let flushing: Promise<void> | null = null;

// Sends pending sales in batches. Synced and duplicate sales leave the queue. A rejected sale stays with its
// message, for the owner to review. A retry stays pending.
export function flushOutbox(): Promise<void> {
  flushing ??= doFlush().finally(() => {
    flushing = null;
  });
  return flushing;
}

// The fields the server takes. Device-only fields (status, message, total) stay on the device.
function toPayload(s: OutboxSale) {
  return {
    id: s.id,
    shiftId: s.shiftId,
    items: s.items,
    billDiscountSatang: s.billDiscountSatang,
    payment: s.payment,
    tenderedSatang: s.tenderedSatang,
    clientCreatedAt: s.clientCreatedAt,
  };
}

async function doFlush(): Promise<void> {
  if (!navigator.onLine) return;
  const pending = (await listSales()).filter((s) => s.status === "pending");
  for (let i = 0; i < pending.length; i += 50) {
    const batch = pending.slice(i, i + 50);
    let response: Response;
    try {
      response = await fetch("/api/sales/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sales: batch.map(toPayload) }),
      });
    } catch {
      break;
    }
    if (!response.ok) break;
    const body = (await response.json()) as { ok: boolean; data?: { results: SyncResult[] } };
    for (const result of body.data?.results ?? []) {
      if (result.status === "synced" || result.status === "duplicate") {
        await deleteSale(result.id);
      } else if (result.status === "rejected") {
        const sale = batch.find((s) => s.id === result.id);
        if (sale) await putSale({ ...sale, status: "rejected", message: result.message });
      }
    }
    notify();
  }
  notify();
}

export { listSales, deleteSale };

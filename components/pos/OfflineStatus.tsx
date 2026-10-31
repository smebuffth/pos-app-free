"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { listSales } from "@/lib/offline/store";
import { OUTBOX_EVENT } from "@/lib/offline/outbox";

// Shows the connection state and how many sales wait to be sent, or need review.
export function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [rejected, setRejected] = useState(0);

  useEffect(() => {
    const refresh = async () => {
      setOnline(navigator.onLine);
      try {
        const sales = await listSales();
        setPending(sales.filter((s) => s.status === "pending").length);
        setRejected(sales.filter((s) => s.status === "rejected").length);
      } catch {
        // Storage can be blocked. The status then shows only the connection.
      }
    };
    void refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.addEventListener(OUTBOX_EVENT, refresh);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.removeEventListener(OUTBOX_EVENT, refresh);
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      {!online ? (
        <Badge tone="warning">
          <CloudOff aria-hidden />
          ออฟไลน์
        </Badge>
      ) : null}
      {pending > 0 ? (
        <Badge tone="primary">
          <RefreshCw aria-hidden />
          รอซิงก์ {pending} บิล
        </Badge>
      ) : null}
      {rejected > 0 ? (
        <Link href="/sync">
          <Badge tone="danger">ต้องตรวจสอบ {rejected} บิล</Badge>
        </Link>
      ) : null}
    </div>
  );
}

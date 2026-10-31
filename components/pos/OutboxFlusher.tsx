"use client";

import { useEffect } from "react";
import { flushOutbox } from "@/lib/offline/outbox";

// Sends the queued sales when the page opens, when the connection comes back, and every 30 seconds.
export function OutboxFlusher() {
  useEffect(() => {
    const run = () => void flushOutbox();
    run();
    window.addEventListener("online", run);
    const timer = window.setInterval(run, 30_000);
    return () => {
      window.removeEventListener("online", run);
      window.clearInterval(timer);
    };
  }, []);
  return null;
}

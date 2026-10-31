"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { promptPayPayload } from "@/lib/promptpay";
import { formatTHB } from "@/lib/money";

// The QR is drawn in the browser. The payload never leaves the device.
export function PromptPayQr({ target, amountSatang }: { target: string; amountSatang: number }) {
  const payload = promptPayPayload(target, amountSatang);
  const [drawn, setDrawn] = useState<{ payload: string; src: string } | null>(null);

  useEffect(() => {
    if (!payload) return;
    let cancelled = false;
    QRCode.toDataURL(payload, { margin: 1, width: 240, errorCorrectionLevel: "M" }).then((url) => {
      if (!cancelled) setDrawn({ payload, src: url });
    });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  if (!payload) {
    return <p className="text-sm text-destructive">ยังไม่ได้ตั้งเลข PromptPay ของร้าน กรุณาตั้งค่าร้านก่อน</p>;
  }
  const src = drawn?.payload === payload ? drawn.src : null;
  return (
    <figure className="flex flex-col items-center gap-2">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- generated in the browser, no network fetch
        <img src={src} alt={`QR PromptPay ยอด ${formatTHB(amountSatang)}`} width={240} height={240} className="rounded-xl bg-white p-2" />
      ) : (
        <div className="size-60 animate-pulse rounded-xl bg-tint" aria-hidden />
      )}
      <figcaption className="text-sm text-subtle">สแกนเพื่อชำระ {formatTHB(amountSatang)}</figcaption>
    </figure>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// The browser's own detector is used where it exists. Elsewhere ZXing reads the same frames.
type NativeDetector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type NativeDetectorClass = new (options: { formats: string[] }) => NativeDetector;

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"];

type Props = { open: boolean; onOpenChange: (open: boolean) => void; onCode: (code: string) => void };

export function BarcodeScanner({ open, onOpenChange, onCode }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const handlers = useRef({ onCode, onOpenChange });
  useEffect(() => {
    handlers.current = { onCode, onOpenChange };
  });

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: number | null = null;
    let controls: IScannerControls | null = null;
    const video = videoRef.current;

    const finish = (code: string) => {
      if (stopped) return;
      stopped = true;
      handlers.current.onCode(code);
      handlers.current.onOpenChange(false);
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (stopped || !video) return;
        video.srcObject = stream;
        await video.play();

        const Native = (window as unknown as { BarcodeDetector?: NativeDetectorClass }).BarcodeDetector;
        if (Native) {
          const detector = new Native({ formats: FORMATS });
          const tick = async () => {
            if (stopped) return;
            try {
              const codes = await detector.detect(video);
              if (codes[0]?.rawValue) return finish(codes[0].rawValue);
            } catch {
              // A frame can fail while the video warms up. The next tick tries again.
            }
            timer = window.setTimeout(tick, 150);
          };
          void tick();
        } else {
          const reader = new BrowserMultiFormatReader();
          controls = await reader.decodeFromVideoElement(video, (result) => {
            if (result) finish(result.getText());
          });
          if (stopped) controls.stop();
        }
      } catch {
        if (!stopped) setError("เปิดกล้องไม่ได้ อนุญาตการใช้กล้องในเบราว์เซอร์ หรือใช้เครื่องสแกนบาร์โค้ดแทน");
      }
    })();

    return () => {
      stopped = true;
      if (timer !== null) window.clearTimeout(timer);
      controls?.stop();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>สแกนบาร์โค้ด</DialogTitle>
          <DialogDescription>หันกล้องไปที่บาร์โค้ดของสินค้า</DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : (
          <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full rounded-xl bg-black object-cover" aria-label="ภาพจากกล้อง" />
        )}
      </DialogContent>
    </Dialog>
  );
}

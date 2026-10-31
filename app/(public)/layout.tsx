import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/shell/BrandMark";

export const instant = false;

const focusRing = "outline-none focus-visible:ring-3 focus-visible:ring-primary/40 focus-visible:ring-offset-2";

// Shared shell for the sign-in and setup pages: the logo (back to the landing page) in the header, a plain footer,
// and the same soft grid as the landing hero behind the content.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-bg">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary text-sm font-medium text-primary-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:px-4 focus:py-3"
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>
      <div className="bg-grid pointer-events-none absolute inset-0 -z-0" aria-hidden />
      <div
        className="pointer-events-none absolute -top-48 right-[-10%] h-[28rem] w-[36rem] rounded-full bg-gradient-to-b from-primary/10 to-transparent blur-3xl"
        aria-hidden
      />

      <header className="relative border-b border-border/70 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 lg:px-8">
          <Link href="/" aria-label="Nisia POS กลับหน้าแรก" className={`flex min-h-11 items-center rounded-lg ${focusRing}`}>
            <BrandMark />
          </Link>
          <Link
            href="/"
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-subtle hover:bg-tint hover:text-fg ${focusRing}`}
          >
            <ArrowLeft className="size-4" aria-hidden />
            หน้าแรก
          </Link>
        </div>
      </header>
      <main id="main" className="relative flex flex-1 flex-col">
        {children}
      </main>
      <footer className="relative border-t border-border/70">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-subtle lg:px-8">ระบบขายหน้าร้านสำหรับร้านค้า โดย Nisia Studio</div>
      </footer>
    </div>
  );
}

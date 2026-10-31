import type { ReactNode } from "react";
import { BarChart3, PackageCheck, ReceiptText, WifiOff } from "lucide-react";

// Login and setup: the intro on the left and the form card on the right from 1024 px. One column below that.
export function AuthSplit({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-20">
      <section className="space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-fg lg:text-4xl">{title}</h1>
          <p className="max-w-md text-base leading-relaxed text-subtle">{subtitle}</p>
        </div>
        <ul className="hidden space-y-4 lg:block">
          <IntroRow icon={<ReceiptText className="size-5" aria-hidden />} text="ขายหน้าร้านได้เร็ว พิมพ์ใบเสร็จและรับ PromptPay" />
          <IntroRow icon={<WifiOff className="size-5" aria-hidden />} text="เน็ตหลุดก็ขายต่อได้ บิลส่งขึ้นระบบเมื่อกลับมาออนไลน์" />
          <IntroRow icon={<PackageCheck className="size-5" aria-hidden />} text="สต็อกตัดอัตโนมัติทุกบิล และแจ้งเตือนของใกล้หมด" />
          <IntroRow icon={<BarChart3 className="size-5" aria-hidden />} text="ดูยอดขาย กะ และสินค้าขายดีได้ทันที" />
        </ul>
      </section>
      <div className="w-full max-w-md justify-self-center rounded-2xl border border-border bg-bg/95 p-6 shadow-[0_24px_60px_-28px_rgba(29,78,216,0.45)] backdrop-blur lg:justify-self-end lg:p-8">
        {children}
      </div>
    </div>
  );
}

function IntroRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-text">
        {icon}
      </span>
      <span className="text-sm leading-relaxed text-fg">{text}</span>
    </li>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Check,
  ChevronDown,
  Clock,
  Crown,
  History,
  KeyRound,
  LogIn,
  PackagePlus,
  Play,
  QrCode,
  ScanBarcode,
  ShieldCheck,
  Sparkles,
  Store,
  UserRound,
  Warehouse,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { BrandMark } from "@/components/shell/BrandMark";
import { PosPreview } from "@/components/landing/PosPreview";
import { Reveal } from "@/components/landing/Reveal";
import { cn } from "@/lib/utils";

// Every claim on this page is a feature the app ships today (README.md). The known gaps are answered in the FAQ.

const NAV = [
  { href: "#features", label: "ฟีเจอร์" },
  { href: "#how", label: "เริ่มใช้งาน" },
  { href: "#roles", label: "สิทธิ์การใช้งาน" },
  { href: "#faq", label: "คำถามที่พบบ่อย" },
];

const FACTS = [
  { value: "4 วิธี", label: "รับชำระ เงินสด PromptPay โอน บัตร" },
  { value: "ออฟไลน์", label: "ขายต่อได้ ส่งบิลเมื่อเน็ตกลับมา" },
  { value: "3 ระดับ", label: "สิทธิ์ เจ้าของ ผู้จัดการ แคชเชียร์" },
  { value: "ทุกจอ", label: "มือถือ แท็บเล็ต และคอมพิวเตอร์" },
];

const FEATURES: { icon: LucideIcon; title: string; body: string; tone: string }[] = [
  {
    icon: ScanBarcode,
    title: "หน้าขายที่เร็วทันใจ",
    body: "สแกนบาร์โค้ดด้วยกล้องหรือเครื่องสแกน ใส่ส่วนลดรายรายการหรือทั้งบิล และคำนวณเงินทอนให้ทันที",
    tone: "bg-primary/10 text-primary",
  },
  {
    icon: WifiOff,
    title: "ขายได้แม้ไม่มีเน็ต",
    body: "บิลเก็บไว้ในเครื่องพร้อมเลขบิลประจำเครื่อง แล้วส่งขึ้นระบบเองเมื่อกลับมาออนไลน์",
    tone: "bg-amber-100 text-amber-800",
  },
  {
    icon: QrCode,
    title: "PromptPay QR ในตัว",
    body: "สร้าง QR ตามยอดบิลในเครื่อง ลูกค้าสแกนจ่ายได้เลย ไม่ต้องพิมพ์ยอดเอง",
    tone: "bg-sky-100 text-sky-800",
  },
  {
    icon: Warehouse,
    title: "สต็อกตรงกับของจริง",
    body: "ตัดสต็อกทุกบิล รับสินค้าเข้า ปรับตามการนับจริง และย้อนดูการเคลื่อนไหวได้ทุกครั้ง",
    tone: "bg-emerald-100 text-emerald-800",
  },
  {
    icon: Clock,
    title: "กะการขายและเงินสด",
    body: "เปิดกะ บันทึกเงินเข้าออกระหว่างวัน แล้วปิดกะพร้อมเห็นส่วนต่างเงินสดทันที",
    tone: "bg-violet-100 text-violet-800",
  },
  {
    icon: BarChart3,
    title: "รายงานที่อ่านง่าย",
    body: "ยอดขายตามช่วงวันที่ สินค้าขายดี และบิลที่ยกเลิก ส่งออกเป็น CSV ได้ในคลิกเดียว",
    tone: "bg-rose-100 text-rose-800",
  },
];

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Store, title: "สร้างบัญชีเจ้าของร้าน", body: "ตั้งชื่อร้าน อีเมล และรหัสผ่านในหน้าเดียว ใช้เวลาไม่กี่นาที" },
  { icon: PackagePlus, title: "เพิ่มสินค้าและพนักงาน", body: "ใส่ราคา บาร์โค้ด และหมวดหมู่ แล้วให้สิทธิ์พนักงานตามหน้าที่" },
  { icon: Play, title: "เปิดกะ แล้วเริ่มขาย", body: "แคชเชียร์เข้าหน้าขายได้ทันที ยอดขายขึ้นหน้าภาพรวมของคุณแบบเรียลไทม์" },
];

const ROLES: { icon: LucideIcon; title: string; items: string[] }[] = [
  { icon: Crown, title: "เจ้าของร้าน", items: ["ภาพรวมและรายงานทั้งหมด", "ผู้ช่วย AI ถามยอดขาย", "จัดการพนักงานและตั้งค่าร้าน"] },
  { icon: Briefcase, title: "ผู้จัดการ", items: ["สินค้า หมวดหมู่ และสต็อก", "รายงานและส่งออก CSV", "ตรวจบิลออฟไลน์ที่มีปัญหา"] },
  { icon: UserRound, title: "แคชเชียร์", items: ["หน้าขายและรับชำระเงิน", "เปิดและปิดกะ", "ดูบิลการขายของร้าน"] },
];

const SECURITY: { icon: LucideIcon; text: string }[] = [
  { icon: KeyRound, text: "รหัสผ่านเก็บแบบแฮช PBKDF2 อ่านย้อนกลับไม่ได้" },
  { icon: ShieldCheck, text: "ตรวจสิทธิ์ทุกหน้าและทุก API ไม่ใช่แค่ซ่อนปุ่ม" },
  { icon: History, text: "บันทึกการกระทำสำคัญ เช่น ยกเลิกบิล ปรับสต็อก แก้ราคา" },
];

const FAQ = [
  {
    q: "ต้องติดตั้งโปรแกรมไหม",
    a: "ไม่ต้อง เปิดผ่านเบราว์เซอร์ได้เลย และกด “เพิ่มไปยังหน้าจอหลัก” เพื่อใช้งานแบบแอปบนมือถือหรือแท็บเล็ต",
  },
  {
    q: "ถ้าอินเทอร์เน็ตหลุดระหว่างขาย จะเป็นอย่างไร",
    a: "ขายต่อได้ตามปกติ บิลจะเก็บไว้ในเครื่องแล้วส่งขึ้นระบบเมื่อกลับมาออนไลน์ หากบิลไหนถูกปฏิเสธ ผู้จัดการตรวจได้ในหน้า “บิลออฟไลน์”",
  },
  {
    q: "รับชำระเงินแบบไหนได้บ้าง",
    a: "เงินสดพร้อมคำนวณเงินทอน PromptPay QR โอนเงิน และบัตร สำหรับ PromptPay แคชเชียร์กดยืนยันยอดเอง ระบบยังไม่ตรวจสลิปอัตโนมัติ",
  },
  {
    q: "ใช้กับเครื่องพิมพ์ใบเสร็จได้ไหม",
    a: "พิมพ์ใบเสร็จขนาด 80 มม. ผ่านเบราว์เซอร์ได้ ยังไม่รองรับการสั่งเครื่องพิมพ์ความร้อนแบบ ESC/POS โดยตรง",
  },
  {
    q: "ออกใบกำกับภาษีได้ไหม",
    a: "ตอนนี้เป็นใบเสร็จแบบย่อ แนะนำให้นักบัญชีของร้านตรวจรูปแบบก่อนนำไปใช้จริง",
  },
  {
    q: "ผู้ช่วย AI แก้ไขข้อมูลร้านได้ไหม",
    a: "ไม่ได้ ผู้ช่วย AI อ่านข้อมูลได้อย่างเดียว ตัวเลขทุกตัวมาจากฐานข้อมูลของร้าน และใช้ได้เฉพาะเจ้าของร้าน",
  },
];

const focusRing =
  "outline-none focus-visible:ring-3 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary text-sm font-medium text-primary-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:px-4 focus:py-3"
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>

      <SiteHeader />

      <main id="main" className="flex-1">
        <Hero />
        <Facts />
        <Features />
        <HowItWorks />
        <Roles />
        <Faq />
        <ClosingCta />
      </main>

      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 lg:px-8">
        <Link href="/" aria-label="Nisia POS หน้าแรก" className={cn("flex min-h-11 items-center rounded-lg", focusRing)}>
          <BrandMark />
        </Link>
        <nav aria-label="เมนูหน้าแรก" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className={cn(
                    "flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-subtle transition-colors hover:bg-tint hover:text-fg",
                    focusRing,
                  )}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <Link
          href="/login"
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium text-fg transition-colors hover:border-primary/40 hover:bg-tint",
            focusRing,
          )}
        >
          <LogIn className="size-4" aria-hidden />
          เข้าสู่ระบบ
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[32rem] w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/12 to-transparent blur-3xl" />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pt-14 pb-20 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-8 lg:pt-24 lg:pb-28">
        <div className="space-y-7 text-center lg:text-left">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-sm font-medium text-primary-text">
            <span className="size-1.5 rounded-full bg-sky" aria-hidden />
            ระบบขายหน้าร้านสำหรับร้านค้าไทย
          </p>
          <h1 id="hero-title" className="text-4xl leading-[1.15] font-semibold tracking-tight text-fg sm:text-5xl lg:text-[3.5rem]">
            ขายหน้าร้านได้ไว
            <br />
            <span className="text-gradient-brand">แม้เน็ตจะหลุด</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-subtle lg:mx-0">
            สแกนบาร์โค้ด รับเงินสด PromptPay หรือบัตร ตัดสต็อกให้อัตโนมัติ และดูยอดขายได้ทันที ครบในแอปเดียวที่เปิดได้จากทุกอุปกรณ์
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <PrimaryCta href="/login">เริ่มใช้งาน</PrimaryCta>
            <a
              href="#features"
              className={cn(
                "inline-flex min-h-12 w-full items-center justify-center rounded-full border border-border bg-bg px-6 text-base font-medium text-fg transition-colors hover:border-primary/40 hover:bg-tint sm:w-auto",
                focusRing,
              )}
            >
              ดูฟีเจอร์ทั้งหมด
            </a>
          </div>
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-subtle lg:justify-start">
            {["ไม่ต้องติดตั้งโปรแกรม", "รองรับเครื่องสแกนบาร์โค้ด", "ติดตั้งเป็นแอปได้"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="size-4 text-success" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="px-2 sm:px-6 lg:px-0">
          <PosPreview />
        </div>
      </div>
    </section>
  );
}

function Facts() {
  return (
    <section aria-label="จุดเด่นโดยย่อ" className="border-y border-border bg-tint/60">
      <dl className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-x-4 px-4 lg:grid-cols-4 lg:px-8">
        {FACTS.map((f) => (
          // The value reads first on screen; dt stays first in the markup so the term-description pairing holds.
          <div key={f.value} className="flex flex-col gap-1 py-6 text-center lg:py-9">
            <dt className="text-sm leading-relaxed text-muted-foreground">{f.label}</dt>
            <dd className="order-first text-2xl font-semibold tracking-tight text-fg lg:text-3xl">{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto w-full max-w-6xl px-4 lg:px-8">
        <SectionHeading
          id="features-title"
          eyebrow="ฟีเจอร์"
          title="ทุกอย่างที่ร้านต้องใช้ในแต่ละวัน"
          body="ตั้งแต่เปิดกะตอนเช้าจนปิดยอดตอนค่ำ ออกแบบให้แคชเชียร์ใช้คล่องตั้งแต่วันแรก"
        />

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <Reveal className="h-full">
                <article className="group h-full rounded-2xl border border-border bg-bg p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_12px_32px_-16px_rgba(29,78,216,0.3)]">
                  <span className={cn("flex size-11 items-center justify-center rounded-xl", f.tone)}>
                    <f.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-fg">{f.title}</h3>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-subtle">{f.body}</p>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>

        <Reveal className="mt-4">
          <article className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-[#0b3aa8] p-6 text-primary-fg sm:p-10">
            <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-sky/30 blur-3xl" aria-hidden />
            <div className="relative grid items-center gap-8 lg:grid-cols-2">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
                  <Sparkles className="size-4" aria-hidden />
                  สำหรับเจ้าของร้าน
                </span>
                <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">ถามยอดขายเป็นภาษาไทย ได้คำตอบจากข้อมูลจริง</h3>
                <p className="leading-relaxed text-white/85">
                  ผู้ช่วย AI ตอบจากฐานข้อมูลของร้านโดยตรง อ่านได้อย่างเดียว แก้ไขข้อมูลไม่ได้ ส่วนรายการแนะนำสั่งซื้อคำนวณจากยอดขาย 14 วันล่าสุด ไม่ได้ให้ AI เดา
                </p>
              </div>
              <div aria-hidden className="space-y-3 rounded-xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-white px-4 py-2.5 text-sm text-fg">
                  สัปดาห์นี้อะไรขายดีที่สุด
                </p>
                <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-white/15 px-4 py-3 text-sm leading-relaxed">
                  ลาเต้เย็นขายได้ 142 แก้ว มากที่สุดในสัปดาห์ รองลงมาคือครัวซองต์เนย 96 ชิ้น
                  <span className="mt-2 flex items-center gap-1.5 text-xs text-white/75">
                    <BarChart3 className="size-3.5" />
                    อ้างอิงจากบิลการขาย 7 วันล่าสุด
                  </span>
                </div>
              </div>
            </div>
          </article>
        </Reveal>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-20 bg-tint/60 py-20 lg:py-28">
      <div className="mx-auto w-full max-w-6xl px-4 lg:px-8">
        <SectionHeading id="how-title" eyebrow="เริ่มใช้งาน" title="พร้อมขายใน 3 ขั้นตอน" body="ไม่ต้องติดตั้ง ไม่ต้องตั้งค่าซับซ้อน" />
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Reveal className="h-full">
                <div className="relative h-full rounded-2xl border border-border bg-bg p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-fg">
                      <s.icon className="size-5" aria-hidden />
                    </span>
                    <span className="text-5xl font-semibold text-primary/10 tabular-nums" aria-hidden>
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-fg">
                    <span className="sr-only">ขั้นตอนที่ {i + 1}: </span>
                    {s.title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-subtle">{s.body}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Roles() {
  return (
    <section id="roles" aria-labelledby="roles-title" className="scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto w-full max-w-6xl px-4 lg:px-8">
        <SectionHeading
          id="roles-title"
          eyebrow="สิทธิ์การใช้งาน"
          title="ทุกคนในร้านเห็นเฉพาะสิ่งที่ต้องใช้"
          body="แบ่งสิทธิ์ตามหน้าที่ แคชเชียร์ขายได้คล่อง ส่วนตัวเลขสำคัญอยู่กับเจ้าของร้าน"
        />
        <ul className="mt-12 grid gap-4 md:grid-cols-3">
          {ROLES.map((r) => (
            <li key={r.title}>
              <Reveal className="h-full">
                <div className="h-full rounded-2xl border border-border bg-bg p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <r.icon className="size-5" aria-hidden />
                    </span>
                    <h3 className="text-lg font-semibold text-fg">{r.title}</h3>
                  </div>
                  <ul className="mt-5 space-y-3">
                    {r.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-[0.95rem] text-fg">
                        <Check className="mt-0.5 size-4.5 shrink-0 text-success" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>

        <Reveal className="mt-4">
          <div className="grid gap-4 rounded-2xl border border-border bg-tint/60 p-6 sm:grid-cols-3">
            {SECURITY.map((s) => (
              <p key={s.text} className="flex items-start gap-3 text-sm leading-relaxed text-fg">
                <s.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                {s.text}
              </p>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 bg-tint/60 py-20 lg:py-28">
      <div className="mx-auto w-full max-w-3xl px-4 lg:px-8">
        <SectionHeading id="faq-title" eyebrow="คำถามที่พบบ่อย" title="ตอบตรง ๆ ก่อนเริ่มใช้" />
        <div className="mt-10 space-y-3">
          {FAQ.map((item) => (
            <details key={item.q} className="group rounded-xl border border-border bg-bg open:shadow-sm">
              <summary
                className={cn(
                  "flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 text-left text-base font-medium text-fg [&::-webkit-details-marker]:hidden",
                  focusRing,
                )}
              >
                {item.q}
                <ChevronDown className="size-5 shrink-0 text-subtle transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="px-5 pb-5 leading-relaxed text-subtle">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section aria-labelledby="cta-title" className="py-20 lg:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-fg px-6 py-14 text-center sm:px-12">
            <div className="pointer-events-none absolute -bottom-32 left-1/2 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-primary/50 blur-3xl" aria-hidden />
            <div className="relative mx-auto max-w-2xl space-y-5">
              <h2 id="cta-title" className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                พร้อมเปิดร้านแล้วหรือยัง
              </h2>
              <p className="text-lg leading-relaxed text-white/80">สร้างบัญชีเจ้าของร้าน แล้วเริ่มขายบิลแรกได้ในวันนี้</p>
              <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
                <Link
                  href="/login"
                  className={cn(
                    "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-7 text-base font-semibold text-fg transition-transform hover:-translate-y-0.5 sm:w-auto",
                    "outline-none focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-fg",
                  )}
                >
                  เริ่มใช้งาน
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 text-base font-medium text-white/90 outline-none hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-white/60 sm:w-auto"
                >
                  มีบัญชีแล้ว เข้าสู่ระบบ
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div className="space-y-2">
          <BrandMark size={32} />
          <p className="text-sm text-subtle">ระบบขายหน้าร้านสำหรับร้านค้า โดย Nisia Studio</p>
        </div>
        <nav aria-label="ลิงก์ท้ายหน้า">
          <ul className="flex flex-wrap gap-x-1 gap-y-1">
            {[...NAV, { href: "/login", label: "เข้าสู่ระบบ" }].map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className={cn("flex min-h-11 items-center rounded-lg px-3 text-sm text-subtle hover:text-fg", focusRing)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}

function SectionHeading({ id, eyebrow, title, body }: { id: string; eyebrow: string; title: string; body?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold tracking-wide text-primary-text">{eyebrow}</p>
      <h2 id={id} className="mt-3 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
        {title}
      </h2>
      {body ? <p className="mt-4 text-lg leading-relaxed text-subtle">{body}</p> : null}
    </div>
  );
}

function PrimaryCta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-7 text-base font-semibold text-primary-fg shadow-[0_10px_24px_-10px_rgba(29,78,216,0.7)] transition-all hover:-translate-y-0.5 hover:bg-primary/90 sm:w-auto",
        focusRing,
      )}
    >
      {children}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

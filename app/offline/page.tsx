import Link from "next/link";

export const metadata = { title: "ออฟไลน์" };

// Served when a page is not in the offline copy. Static: it reads nothing.
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-fg">ยังไม่มีการเชื่อมต่อ</h1>
      <p className="text-subtle">หน้านี้ยังไม่ได้เก็บไว้บนเครื่องนี้ ถ้าเคยเปิดหน้าขายไว้ ให้กลับไปที่หน้าขายได้เลย บิลที่ขายตอนออฟไลน์จะส่งเมื่อกลับมาออนไลน์</p>
      <Link href="/sale" className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-fg">
        กลับไปหน้าขาย
      </Link>
    </main>
  );
}

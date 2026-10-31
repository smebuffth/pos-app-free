import { requireUser } from "@/lib/auth/guards";
import { SyncReview } from "@/components/pos/SyncReview";

export const metadata = { title: "บิลออฟไลน์" };

export default async function SyncPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">บิลออฟไลน์</h1>
        <p className="text-sm text-subtle">บิลที่ขายตอนไม่มีอินเทอร์เน็ต จะส่งเข้าระบบเองเมื่อออนไลน์ บิลที่ถูกปฏิเสธต้องให้คนตรวจ</p>
      </header>
      <SyncReview />
    </div>
  );
}

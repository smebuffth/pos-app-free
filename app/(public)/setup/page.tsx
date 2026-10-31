import { redirect } from "next/navigation";
import { connection } from "next/server";
import { withDb } from "@/lib/db";
import { AuthSplit } from "@/components/auth/AuthSplit";
import { SetupForm } from "@/components/auth/SetupForm";

export const metadata = { title: "ตั้งค่าเริ่มต้น" };

// Shown only while no account exists. After the owner is created, this page redirects to sign-in.
export const instant = false;

export default async function SetupPage() {
  await connection();
  const { hasUsers } = await withDb(async (db) => {
    const { rows } = await db.query<{ n: number | string }>("SELECT COUNT(*) AS n FROM users");
    return { hasUsers: Number(rows[0].n) > 0 };
  });
  if (hasUsers) redirect("/login");

  return (
    <AuthSplit title="ตั้งค่าร้านครั้งแรก" subtitle="สร้างบัญชีเจ้าของร้าน บัญชีนี้ใช้จัดการพนักงาน สินค้า และการตั้งค่าร้าน">
      <SetupForm />
    </AuthSplit>
  );
}

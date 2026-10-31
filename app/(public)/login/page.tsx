import { redirect } from "next/navigation";
import { connection } from "next/server";
import { withDb } from "@/lib/db";
import { safeNext } from "@/lib/auth/start";
import { AuthSplit } from "@/components/auth/AuthSplit";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "เข้าสู่ระบบ" };

export const instant = false;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await connection();
  const { next } = await searchParams;
  const { hasUsers } = await withDb(async (db) => {
    const { rows } = await db.query<{ n: number | string }>("SELECT COUNT(*) AS n FROM users");
    return { hasUsers: Number(rows[0].n) > 0 };
  });
  if (!hasUsers) redirect("/setup");

  return (
    <AuthSplit title="เข้าสู่ระบบ Nisia POS" subtitle="ใช้อีเมลและรหัสผ่านที่เจ้าของร้านให้ไว้">
      <LoginForm next={safeNext(next ?? null) ?? undefined} />
    </AuthSplit>
  );
}

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/auth/guards";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { startPath } from "@/lib/auth/start";
import { LandingPage } from "@/components/landing/LandingPage";

export const instant = false;

export const metadata: Metadata = {
  title: { absolute: "Nisia POS · ระบบขายหน้าร้านที่ขายต่อได้แม้ไม่มีเน็ต" },
};

// Signed in: straight to the start page for the role. Signed out: the landing page, except when the installed
// app opens (start_url carries ?source=pwa), which goes to sign-in instead.
export default async function Home({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  await connection();
  const hasSession = Boolean((await cookies()).get(SESSION_COOKIE)?.value);
  if (hasSession) {
    const user = await getCurrentUser();
    if (user) redirect(startPath(user.role));
  }
  if ((await searchParams).source === "pwa") redirect("/login");
  return <LandingPage />;
}

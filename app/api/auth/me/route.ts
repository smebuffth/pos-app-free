import { connection } from "next/server";
import { ok } from "@/lib/http";
import { handle } from "@/lib/http";
import { requireUserApi } from "@/lib/auth/guards";

export async function GET() {
  return handle(async () => {
    await connection();
    const user = await requireUserApi();
    return ok({ id: user.id, name: user.name, email: user.email, role: user.role });
  });
}

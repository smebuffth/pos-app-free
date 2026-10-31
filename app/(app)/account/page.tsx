import Link from "next/link";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { LogoutForm } from "@/components/pos/LogoutForm";
import { ChangePasswordForm } from "@/components/pos/ChangePasswordForm";
import { McpTokenPanel } from "@/components/pos/McpTokenPanel";
import { withDb } from "@/lib/db";
import { listMcpTokens, MCP_ROLES } from "@/lib/mcp/tokens";
import config from "@/project.config.json";
import { NAV, canOpen, mobileTabs, type NavItem } from "@/lib/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "ฉัน" };

const ROLE_LABEL = { owner: "เจ้าของร้าน", manager: "ผู้จัดการ", cashier: "แคชเชียร์" } as const;

// The "ฉัน" tab: profile first, then shortcuts filtered by role, and sign-out last.
export const instant = false;

export default async function AccountPage() {
  await connection();
  const user = await requireUser();
  const canMcp = (MCP_ROLES as readonly string[]).includes(user.role);
  const tokens = canMcp ? await withDb((db) => listMcpTokens(db, user.id)) : [];
  const tabIds = new Set(mobileTabs(user.role).map((t) => t.id));
  const shortcuts: NavItem[] = (Object.values(NAV) as NavItem[]).filter(
    (item) => canOpen(item, user.role) && !tabIds.has(item.id) && item.id !== "accountSettings" && item.id !== "dailyCount",
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header className="flex items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary-text">
          {user.name.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-fg">{user.name}</h1>
          <p className="truncate text-sm text-subtle">{user.email}</p>
          <Badge tone="primary" className="mt-1">
            {ROLE_LABEL[user.role]}
          </Badge>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>เปลี่ยนรหัสผ่าน</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      {canMcp ? (
        <Card>
          <CardHeader>
            <CardTitle>เชื่อมต่อ AI ผ่าน MCP</CardTitle>
          </CardHeader>
          <CardContent>
            <McpTokenPanel
              tokens={tokens.map((t) => ({ id: t.id, name: t.name, hint: t.hint, expiresAt: t.expiresAt.toISOString(), lastUsedAt: t.lastUsedAt?.toISOString() ?? null }))}
              endpoint={`https://${config.app.domain}/mcp`}
            />
          </CardContent>
        </Card>
      ) : null}

      {shortcuts.length > 0 ? (
        <section aria-labelledby="shortcuts" className="space-y-2">
          <h2 id="shortcuts" className="sr-only">
            ทางลัด
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {shortcuts.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <Link href={item.href} className="flex min-h-14 items-center gap-3 px-4 text-fg hover:bg-tint">
                    <Icon className="size-5 text-subtle" aria-hidden />
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <LogoutForm />
    </div>
  );
}

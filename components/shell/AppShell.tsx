import Link from "next/link";
import type { ReactNode } from "react";
import { UserRound } from "lucide-react";
import { SIDEBAR_GROUPS, ADMIN_GROUP, NAV, canOpen, mobileTabs, type NavItem } from "@/lib/nav";
import type { AuthUser } from "@/lib/auth/session";
import { SidebarLink, BottomTabLink, type NavLinkItem } from "@/components/shell/NavLinks";
import { OfflineStatus } from "@/components/pos/OfflineStatus";
import { BrandMark } from "@/components/shell/BrandMark";

const ROLE_LABEL = { owner: "เจ้าของร้าน", manager: "ผู้จัดการ", cashier: "แคชเชียร์" } as const;

// Only plain fields go to the Client Component; the icon is looked up there by id. See NavLinks.
const toLink = (item: NavItem): NavLinkItem => ({ id: item.id, label: item.label, href: item.href, roles: item.roles });

// Desktop (1024 px and up): a grouped sidebar. Below it: the top bar and five bottom tabs.
export function AppShell({ user, storeName, children }: { user: AuthUser; storeName: string; children: ReactNode }) {
  const groups = SIDEBAR_GROUPS.map((g) => ({
    ...g,
    items: g.items.map((key) => NAV[key] as NavItem).filter((item) => canOpen(item, user.role)).map(toLink),
  })).filter((g) => g.items.length > 0);
  const adminItems = ADMIN_GROUP.items.map((key) => NAV[key] as NavItem).filter((item) => canOpen(item, user.role)).map(toLink);
  const tabs = mobileTabs(user.role).map(toLink);

  return (
    <div className="flex min-h-dvh bg-bg">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-sidebar-border bg-sidebar px-3 py-5 lg:flex">
        <Link
          href="/home"
          className="flex min-h-11 items-center rounded-lg px-3 outline-none focus-visible:ring-3 focus-visible:ring-primary/40"
        >
          <BrandMark />
        </Link>
        <nav aria-label="เมนูหลัก" className="flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.id} className="space-y-1">
              <p className="px-3 text-xs font-medium text-subtle">{group.label}</p>
              {group.items.map((item) => (
                <SidebarLink key={item.id} item={item} />
              ))}
            </div>
          ))}
          {adminItems.length > 0 ? (
            <div className="space-y-1">
              <p className="px-3 text-xs font-medium text-subtle">{ADMIN_GROUP.label}</p>
              {adminItems.map((item) => (
                <SidebarLink key={item.id} item={item} />
              ))}
            </div>
          ) : null}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-bg/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-8">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-fg lg:hidden">{storeName}</p>
              <p className="hidden truncate text-sm text-subtle lg:block">{storeName}</p>
            </div>
            <div className="flex items-center gap-3">
              <OfflineStatus />
              <Link
                href="/account"
                className="flex min-h-11 items-center gap-2 rounded-full border border-border px-3 text-sm text-fg hover:bg-tint"
              >
                <UserRound className="size-5" aria-hidden />
                <span className="hidden max-w-40 truncate sm:inline">{user.name}</span>
                <span className="sr-only">{ROLE_LABEL[user.role]}</span>
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pt-6 pb-28 lg:px-8 lg:pb-10">{children}</main>

        <nav
          aria-label="เมนูด้านล่าง"
          className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        >
          {tabs.map((item) => (
            <BottomTabLink key={item.id} item={item} />
          ))}
        </nav>
      </div>
    </div>
  );
}

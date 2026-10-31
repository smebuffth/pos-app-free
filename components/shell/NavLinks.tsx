"use client";

import { createElement } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

// Icons are functions, which cannot cross from a Server Component into this file. Each link therefore
// receives only plain fields and looks its icon up by id.
export type NavLinkItem = Omit<NavItem, "icon">;

// The icons are module-level constants in lib/nav, so nothing is created during render.
const navIcon = (item: NavLinkItem, className: string) =>
  createElement(NAV[item.id as keyof typeof NAV].icon, { className, "aria-hidden": true });

// The active item is marked by the current path. Matching is by prefix, so /products/new keeps /products active.
export function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/home" && pathname.startsWith(`${href}/`));
}

export function SidebarLink({ item }: { item: NavLinkItem }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-sidebar-accent",
        active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground",
      )}
    >
      {navIcon(item, "size-5 shrink-0")}
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function BottomTabLink({ item }: { item: NavLinkItem }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium",
        active ? "text-primary-text" : "text-subtle",
      )}
    >
      <span className={cn("flex h-7 w-14 items-center justify-center rounded-full", active && "bg-primary/10")}>
        {navIcon(item, "size-5")}
      </span>
      <span className="leading-normal">{item.label}</span>
    </Link>
  );
}

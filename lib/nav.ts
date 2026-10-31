import type { LucideIcon } from "lucide-react";
import { BarChart3, Boxes, ClipboardList, Home, Package, ReceiptText, ShoppingCart, Store, Tags, UserRound, Users, Clock, Sparkles, Warehouse } from "lucide-react";
import type { Role } from "@/lib/auth/session";

export type NavItem = { id: string; label: string; href: string; icon: LucideIcon; roles: Role[] };

const ALL: Role[] = ["owner", "manager", "cashier"];
const MANAGE: Role[] = ["owner", "manager"];

// One list for the sidebar (desktop), the bottom tabs (mobile) and the account shortcuts.
export const NAV = {
  home: { id: "home", label: "หน้าหลัก", href: "/home", icon: Home, roles: ALL },
  sale: { id: "sale", label: "ขาย", href: "/sale", icon: ShoppingCart, roles: ALL },
  shifts: { id: "shifts", label: "กะการขาย", href: "/shifts", icon: Clock, roles: ALL },
  orders: { id: "orders", label: "บิลการขาย", href: "/orders", icon: ReceiptText, roles: ALL },
  products: { id: "products", label: "สินค้า", href: "/products", icon: Package, roles: ALL },
  categories: { id: "categories", label: "หมวดหมู่", href: "/products/categories", icon: Tags, roles: MANAGE },
  stock: { id: "stock", label: "สต็อก", href: "/stock", icon: Warehouse, roles: MANAGE },
  reports: { id: "reports", label: "รายงาน", href: "/reports", icon: BarChart3, roles: MANAGE },
  assistant: { id: "assistant", label: "ผู้ช่วย AI", href: "/assistant", icon: Sparkles, roles: ["owner"] },
  accountSettings: { id: "accountSettings", label: "การตั้งค่าบัญชี", href: "/account", icon: UserRound, roles: ALL },
  users: { id: "users", label: "พนักงาน", href: "/staff", icon: Users, roles: ["owner"] },
  storeSettings: { id: "storeSettings", label: "ตั้งค่าร้าน", href: "/settings", icon: Store, roles: ["owner"] },
  aiSettings: { id: "aiSettings", label: "เชื่อมต่อ AI", href: "/account/ai", icon: Boxes, roles: ["owner"] },
  dailyCount: { id: "dailyCount", label: "ปิดกะ", href: "/shifts", icon: ClipboardList, roles: ALL },
} satisfies Record<string, NavItem>;

// Sidebar groups, in order. Each group shows only the items the role may open.
export const SIDEBAR_GROUPS: { id: string; label: string; items: (keyof typeof NAV)[] }[] = [
  { id: "overview", label: "ภาพรวม", items: ["home"] },
  { id: "sales", label: "การขาย", items: ["sale", "shifts", "orders"] },
  { id: "inventory", label: "สินค้าและสต็อก", items: ["products", "categories", "stock"] },
  { id: "reports", label: "รายงาน", items: ["reports", "assistant"] },
  { id: "account", label: "บัญชี", items: ["accountSettings"] },
];

export const ADMIN_GROUP: { id: string; label: string; items: (keyof typeof NAV)[] } = {
  id: "admin",
  label: "ผู้ดูแล",
  items: ["users", "storeSettings", "aiSettings"],
};

// Five bottom tabs, always five. The owner and managers see reports; a cashier sees the bills instead.
export function mobileTabs(role: Role): NavItem[] {
  const reportsOrBills = role === "cashier" ? NAV.orders : NAV.reports;
  return [NAV.home, NAV.sale, NAV.products, reportsOrBills, NAV.accountSettings];
}

export const canOpen = (item: NavItem, role: Role) => item.roles.includes(role);

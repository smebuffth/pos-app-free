import type { Role } from "@/lib/auth/session";

// Where each role lands after signing in. A cashier starts at the counter; the owner and managers at the dashboard.
export const startPath = (role: Role) => (role === "cashier" ? "/sale" : "/home");

// Accepts only a path on this site, so a crafted ?next= cannot send the user elsewhere.
export function safeNext(next: FormDataEntryValue | null): string | null {
  if (typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/login")) return null;
  return next;
}

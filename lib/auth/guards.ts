import { cache } from "react";
import { redirect } from "next/navigation";
import { withDb } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { readSessionUser, type AuthUser, type Role } from "@/lib/auth/session";

// One database read per request, shared by layouts, pages, and actions.
export const getCurrentUser = cache(() => withDb((db) => readSessionUser(db)));

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Pages. A role that is not allowed is sent to its own start page.
export async function requireRole(...roles: Role[]): Promise<AuthUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/sale");
  return user;
}

export const requireManager = () => requireRole("owner", "manager");
export const requireOwner = () => requireRole("owner");

// Route handlers: the same checks, answered as JSON.
export async function requireUserApi(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "unauthenticated", "กรุณาเข้าสู่ระบบ");
  return user;
}

export async function requireRoleApi(...roles: Role[]): Promise<AuthUser> {
  const user = await requireUserApi();
  if (!roles.includes(user.role)) throw new HttpError(403, "forbidden", "ไม่มีสิทธิ์เข้าถึง");
  return user;
}

export const requireManagerApi = () => requireRoleApi("owner", "manager");

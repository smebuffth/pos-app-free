"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { tx, withDb } from "@/lib/db";
import { bad, good, type Result } from "@/lib/http";
import { audit } from "@/lib/audit";
import { newId } from "@/lib/ids";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, revokeOtherSessions, type Role } from "@/lib/auth/session";
import { clearFailures, isLimited, recordFailure } from "@/lib/auth/rate-limit";
import { requireOwner, requireUser } from "@/lib/auth/guards";
import { safeNext, startPath } from "@/lib/auth/start";

const PASSWORD_MIN = 8;
const emailField = z.email("กรอกอีเมลให้ถูกต้อง").max(254);
const passwordField = z.string().min(PASSWORD_MIN, `รหัสผ่านต้องมีอย่างน้อย ${PASSWORD_MIN} ตัวอักษร`).max(200);
const text = (name: string) => String(name ?? "");

async function clientIp(): Promise<string> {
  return (await headers()).get("cf-connecting-ip") ?? "unknown";
}

const loginSchema = z.object({ email: emailField, password: z.string().min(1).max(200) });

export async function loginAction(_prev: Result<null> | undefined, formData: FormData): Promise<Result<null>> {
  const parsed = loginSchema.safeParse({
    email: text(formData.get("email") as string).trim(),
    password: text(formData.get("password") as string),
  });
  if (!parsed.success) return bad("validation_error", "กรอกอีเมลและรหัสผ่านให้ครบ");
  const mail = parsed.data.email.toLowerCase();
  const keys = [`email:${mail}`, `ip:${await clientIp()}`];

  const outcome = await withDb(async (db) => {
    if (await isLimited(db, keys)) return "limited" as const;
    const { rows } = await db.query<{ id: string; password_hash: string; role: Role; active: number }>(
      "SELECT id, password_hash, role, active FROM users WHERE email = $1",
      [mail],
    );
    const user = rows[0];
    const valid = Boolean(user && user.active === 1 && (await verifyPassword(parsed.data.password, user.password_hash)));
    if (!valid) {
      await recordFailure(db, keys);
      return "invalid" as const;
    }
    await clearFailures(db, keys);
    await createSession(db, user.id);
    return user.role;
  });

  if (outcome === "limited") return bad("too_many_attempts", "เข้าสู่ระบบผิดหลายครั้ง กรุณารอ 15 นาทีแล้วลองใหม่");
  if (outcome === "invalid") return bad("invalid_credentials", "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  redirect(safeNext(formData.get("next")) ?? startPath(outcome));
}

const setupSchema = z.object({ name: z.string().trim().min(1, "กรอกชื่อ").max(80), email: emailField, password: passwordField });

// First run only: creates the owner while no account exists. Staff are added by the owner afterwards.
export async function setupOwnerAction(_prev: Result<null> | undefined, formData: FormData): Promise<Result<null>> {
  const parsed = setupSchema.safeParse({
    name: text(formData.get("name") as string),
    email: text(formData.get("email") as string).trim(),
    password: text(formData.get("password") as string),
  });
  if (!parsed.success) return bad("validation_error", parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
  const { name, password } = parsed.data;
  const mail = parsed.data.email.toLowerCase();
  const passwordHash = await hashPassword(password);

  const outcome = await withDb((db) =>
    tx(db, async () => {
      const { rows } = await db.query<{ n: number | string }>("SELECT COUNT(*) AS n FROM users");
      if (Number(rows[0].n) > 0) return "exists" as const;
      const id = newId();
      const now = new Date();
      await db.query(
        "INSERT INTO users (id, email, name, password_hash, role, active, created_at, updated_at) VALUES ($1, $2, $3, $4, 'owner', 1, $5, $5)",
        [id, mail, name, passwordHash, now],
      );
      await audit(db, id, "setup.owner", "user", id);
      await createSession(db, id);
      return "ok" as const;
    }),
  );
  if (outcome === "exists") return bad("already_set_up", "มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ");
  redirect("/home");
}

export async function logoutAction(): Promise<void> {
  await withDb((db) => destroySession(db));
  redirect("/login");
}

const staffSchema = z.object({
  name: z.string().trim().min(1, "กรอกชื่อ").max(80),
  email: emailField,
  password: passwordField,
  role: z.enum(["manager", "cashier"], "เลือกตำแหน่ง"),
});

export async function createStaffAction(_prev: Result<null> | undefined, formData: FormData): Promise<Result<null>> {
  const owner = await requireOwner();
  const parsed = staffSchema.safeParse({
    name: text(formData.get("name") as string),
    email: text(formData.get("email") as string).trim(),
    password: text(formData.get("password") as string),
    role: text(formData.get("role") as string),
  });
  if (!parsed.success) return bad("validation_error", parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
  const mail = parsed.data.email.toLowerCase();
  const passwordHash = await hashPassword(parsed.data.password);

  return withDb((db) =>
    tx(db, async () => {
      const { rows } = await db.query<{ id: string }>("SELECT id FROM users WHERE email = $1", [mail]);
      if (rows[0]) return bad("email_taken", "อีเมลนี้ถูกใช้แล้ว");
      const id = newId();
      const now = new Date();
      await db.query(
        "INSERT INTO users (id, email, name, password_hash, role, active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, 1, $6, $6)",
        [id, mail, parsed.data.name, passwordHash, parsed.data.role, now],
      );
      await audit(db, owner.id, "staff.create", "user", id, { role: parsed.data.role });
      return good(null);
    }),
  );
}

const staffUpdateSchema = z.object({
  id: z.string().min(1).max(64),
  role: z.enum(["manager", "cashier"]),
  active: z.enum(["0", "1"]),
});

export async function updateStaffAction(_prev: Result<null> | undefined, formData: FormData): Promise<Result<null>> {
  const owner = await requireOwner();
  const parsed = staffUpdateSchema.safeParse({
    id: text(formData.get("id") as string),
    role: text(formData.get("role") as string),
    active: text(formData.get("active") as string),
  });
  if (!parsed.success) return bad("validation_error", "ข้อมูลไม่ถูกต้อง");
  if (parsed.data.id === owner.id) return bad("self_change", "เปลี่ยนสิทธิ์ของตัวเองไม่ได้");

  return withDb((db) =>
    tx(db, async () => {
      const { rows } = await db.query<{ role: Role }>("SELECT role FROM users WHERE id = $1", [parsed.data.id]);
      if (!rows[0]) return bad("not_found", "ไม่พบผู้ใช้งาน");
      if (rows[0].role === "owner") return bad("owner_locked", "ไม่สามารถแก้ไขบัญชีเจ้าของได้");
      const active = parsed.data.active === "1" ? 1 : 0;
      await db.query("UPDATE users SET role = $2, active = $3, updated_at = $4 WHERE id = $1", [
        parsed.data.id,
        parsed.data.role,
        active,
        new Date(),
      ]);
      // A deactivated user is signed out everywhere at once.
      if (active === 0) await db.query("DELETE FROM sessions WHERE user_id = $1", [parsed.data.id]);
      await audit(db, owner.id, "staff.update", "user", parsed.data.id, { role: parsed.data.role, active });
      return good(null);
    }),
  );
}

const passwordChangeSchema = z.object({
  current: z.string().min(1).max(200),
  next: passwordField,
});

export async function changePasswordAction(_prev: Result<null> | undefined, formData: FormData): Promise<Result<null>> {
  const user = await requireUser();
  const parsed = passwordChangeSchema.safeParse({
    current: text(formData.get("current") as string),
    next: text(formData.get("next") as string),
  });
  if (!parsed.success) return bad("validation_error", parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");

  return withDb((db) =>
    tx(db, async () => {
      const { rows } = await db.query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [user.id]);
      if (!rows[0] || !(await verifyPassword(parsed.data.current, rows[0].password_hash))) {
        return bad("invalid_password", "รหัสผ่านปัจจุบันไม่ถูกต้อง");
      }
      await db.query("UPDATE users SET password_hash = $2, updated_at = $3 WHERE id = $1", [
        user.id,
        await hashPassword(parsed.data.next),
        new Date(),
      ]);
      await revokeOtherSessions(db, user.id);
      await audit(db, user.id, "account.password", "user", user.id);
      return good(null);
    }),
  );
}

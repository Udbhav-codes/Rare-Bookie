"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin, NotAdminError } from "@/lib/auth";
import { all, get, run, SCHEMA } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { ActionState } from "@/lib/types";

const MIN_PASSWORD = 10;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function fail(e: unknown): ActionState {
  if (e instanceof NotAdminError) return { message: e.message };
  console.error(e);
  return { message: "That change couldn't be saved. Try again." };
}

export async function addAdmin(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const name = str(fd, "name");
    const email = str(fd, "email").toLowerCase();
    const password = String(fd.get("password") ?? "");

    const errors: Record<string, string> = {};
    if (!name) errors.name = "Enter the person's name.";
    if (!email) errors.email = "Enter an email address.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = "That doesn't look like an email address.";
    if (!password) errors.password = "Set a password for this account.";
    else if (password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
    if (Object.keys(errors).length) return { errors };

    const clash = await get(`SELECT 1 FROM ${SCHEMA}.admins WHERE lower(email) = lower(?)`, email);
    if (clash) return { errors: { email: "An admin with this email already exists." } };

    await run(
      `INSERT INTO ${SCHEMA}.admins(name, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
      name,
      email,
      hashPassword(password),
      new Date().toISOString(),
    );
    revalidatePath("/", "layout");
    return { ok: true, stamp: Date.now(), message: `${name} can now sign in with ${email}.` };
  } catch (e) {
    return fail(e);
  }
}

export async function removeAdmin(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const me = await assertAdmin();
    const id = Number(fd.get("id"));
    if (id === me.id) return { message: "You can't remove your own account. Ask another admin to do it." };

    const target = await get<{ name: string; email: string }>(`SELECT name, email FROM ${SCHEMA}.admins WHERE id = ?`, id);
    if (!target) return { message: "That account was already removed." };
    const count = await get<{ n: number }>(`SELECT COUNT(*)::int AS n FROM ${SCHEMA}.admins`);
    if ((count?.n ?? 0) <= 1) return { message: "This is the last admin account, so it can't be removed." };

    await run(`DELETE FROM ${SCHEMA}.admins WHERE id = ?`, id);
    revalidatePath("/", "layout");
    return { ok: true, stamp: Date.now(), message: `Removed ${target.name} (${target.email}). Their loan records stay in the history.` };
  } catch (e) {
    return fail(e);
  }
}

export async function changeMyPassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const me = await assertAdmin();
    const current = String(fd.get("current") ?? "");
    const next = String(fd.get("next") ?? "");
    const confirm = String(fd.get("confirm") ?? "");

    const errors: Record<string, string> = {};
    if (!current) errors.current = "Enter your current password.";
    if (!next) errors.next = "Enter a new password.";
    else if (next.length < MIN_PASSWORD) errors.next = `Use at least ${MIN_PASSWORD} characters.`;
    if (next && confirm !== next) errors.confirm = "The two passwords don't match.";
    if (Object.keys(errors).length) return { errors };

    const row = await get<{ password_hash: string }>(`SELECT password_hash FROM ${SCHEMA}.admins WHERE id = ?`, me.id);
    if (!row || !verifyPassword(current, row.password_hash)) return { errors: { current: "That's not your current password." } };

    await run(`UPDATE ${SCHEMA}.admins SET password_hash = ? WHERE id = ?`, hashPassword(next), me.id);
    return { ok: true, stamp: Date.now(), message: "Your password has been changed. Use it next time you sign in." };
  } catch (e) {
    return fail(e);
  }
}

export async function listAdmins() {
  await assertAdmin();
  return all<{ id: number; name: string; email: string; created_at: string | null }>(
    `SELECT id, name, email, created_at FROM ${SCHEMA}.admins ORDER BY id`,
  );
}

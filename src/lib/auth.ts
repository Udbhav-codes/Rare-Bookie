import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { get, SCHEMA } from "./db";
import { readSessionToken, SESSION_COOKIE } from "./session";
import type { Admin } from "./types";

export async function getAdmin(): Promise<Admin | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(token);
  if (!session) return null;
  return (await get<Admin>(`SELECT id, name, email FROM ${SCHEMA}.admins WHERE id = ?`, session.adminId)) ?? null;
}

/** For admin pages: bounce to login. */
export async function requireAdmin(next = "/manage/lending"): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect(`/login?next=${encodeURIComponent(next)}`);
  return admin;
}

export class NotAdminError extends Error {
  constructor() {
    super("Your admin session has ended. Sign in again to continue.");
  }
}

/** For server actions and route handlers: every write re-checks the session server-side. */
export async function assertAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) throw new NotAdminError();
  return admin;
}

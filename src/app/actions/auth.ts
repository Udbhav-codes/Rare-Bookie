"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { get, SCHEMA } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import type { ActionState } from "@/lib/types";

// Simple in-memory brute-force guard: 5 failed attempts per IP per 10 minutes.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILS = 5;
const failures = new Map<string, number[]>();

function safeNext(next: FormDataEntryValue | null): string {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/login") ? n : "/manage/lending";
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const recent = (failures.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_FAILS) {
    const mins = Math.ceil((WINDOW_MS - (now - recent[0])) / 60000);
    return { message: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const errors: Record<string, string> = {};
  if (!email) errors.email = "Enter your admin email.";
  if (!password) errors.password = "Enter your password.";
  if (Object.keys(errors).length) return { errors };

  const admin = await get<{ id: number; password_hash: string }>(
    `SELECT id, password_hash FROM ${SCHEMA}.admins WHERE lower(email) = lower(?)`,
    email,
  );
  if (!admin || !verifyPassword(password, admin.password_hash)) {
    recent.push(now);
    failures.set(ip, recent);
    return { message: "That email and password don't match an admin account." };
  }

  failures.delete(ip);
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(admin.id), sessionCookieOptions);
  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/dashboard");
}

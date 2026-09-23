/**
 * Signed session tokens (HMAC-SHA256 via Web Crypto) — shared by proxy.ts and server code.
 * Token = base64url(payload) + "." + base64url(signature). Payload holds the admin id and expiry.
 */

export const SESSION_COOKIE = "rb_session";
/** Sliding inactivity timeout: every request from a signed-in admin pushes expiry forward. */
export const SESSION_TTL_SECONDS = 30 * 60;

const enc = new TextEncoder();

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set in .env.local (32+ characters).");
  return s;
}

let keyPromise: Promise<CryptoKey> | null = null;
function key() {
  keyPromise ??= crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
  return keyPromise;
}

function toB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function createSessionToken(adminId: number): Promise<string> {
  const payload = toB64url(enc.encode(JSON.stringify({ a: adminId, e: Date.now() + SESSION_TTL_SECONDS * 1000 })));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(), enc.encode(payload)));
  return `${payload}.${toB64url(sig)}`;
}

export async function readSessionToken(token: string | undefined): Promise<{ adminId: number } | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const valid = await crypto.subtle.verify("HMAC", await key(), fromB64url(sig), enc.encode(payload));
    if (!valid) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as { a: number; e: number };
    if (typeof data.a !== "number" || data.e < Date.now()) return null;
    return { adminId: data.a };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

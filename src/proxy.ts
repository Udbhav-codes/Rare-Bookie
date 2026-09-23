import { NextResponse, type NextRequest } from "next/server";
import { createSessionToken, readSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

/**
 * - Locks /manage for anyone without a valid admin session (pages also re-check server-side).
 * - Slides the 30-minute inactivity window forward on every request from a signed-in admin.
 */
export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(token);

  if (!session && req.nextUrl.pathname.startsWith("/manage")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}&expired=${token ? "1" : "0"}`;
    const res = NextResponse.redirect(url);
    if (token) res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  const res = NextResponse.next();
  if (session) res.cookies.set(SESSION_COOKIE, await createSessionToken(session.adminId), sessionCookieOptions);
  else if (token) res.cookies.delete(SESSION_COOKIE);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/covers|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};

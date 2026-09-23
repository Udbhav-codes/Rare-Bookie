import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Admin login" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/manage/lending";
  if (await getAdmin()) redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/manage/lending");

  return (
    <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-md content-center px-4 py-12">
      <p className="label-mono text-center text-gilt-ink">Librarian access</p>
      <h1 className="display mt-2 text-center text-5xl">Admin login</h1>
      <p className="mt-3 text-center text-ink-soft">Sign in to lend, return and add books.</p>
      {sp.expired === "1" && (
        <p className="mt-6 rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn" role="status">
          You were signed out after 30 minutes without activity. Sign in again to continue.
        </p>
      )}
      <LoginForm next={next} />
    </div>
  );
}

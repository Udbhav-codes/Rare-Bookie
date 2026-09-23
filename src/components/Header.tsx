"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, Library, Lock, LogIn, LogOut, Moon, Sun, Wrench } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import type { Admin } from "@/lib/types";
import { SearchBox } from "./SearchBox";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/catalogue", label: "Catalogue", icon: Library },
];

export function Header({ admin, libraryName }: { admin: Admin | null; libraryName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const drawerRef = useRef<HTMLElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  // Close drawer when the route changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        burgerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:px-5">
          <button
            ref={burgerRef}
            type="button"
            className="icon-btn burger"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="nav-drawer"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="block">
              <span />
              <span />
              <span />
            </span>
          </button>
          <Link href="/" className="display ml-1 flex items-baseline gap-1.5 text-[1.45rem] leading-none" aria-label={`${libraryName} home`}>
            <span>{libraryName}</span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <SearchBox />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div
        className="backdrop fixed inset-0 z-50 bg-[#0b1020]/45"
        style={{ opacity: open ? 1 : 0, visibility: open ? "visible" : "hidden" }}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <nav
        id="nav-drawer"
        ref={drawerRef}
        aria-label="Main"
        inert={!open}
        className="drawer fixed inset-y-0 left-0 z-50 flex w-[min(20rem,86vw)] flex-col border-r border-line bg-card shadow-lift"
        style={{ transform: open ? "translateX(0)" : "translateX(-102%)" }}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <span className="display text-xl">{libraryName}</span>
          <button type="button" className="icon-btn -mr-2" aria-label="Close menu" onClick={() => setOpen(false)}>
            <span className="text-2xl leading-none">×</span>
          </button>
        </div>

        <ul className="flex flex-col gap-1 p-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className="flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium hover:bg-paper-2 aria-[current=page]:bg-bottle aria-[current=page]:text-on-bottle"
              >
                <Icon size={19} aria-hidden />
                {label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={admin ? "/manage/lending" : "/login?next=/manage/lending"}
              aria-current={isActive("/manage") ? "page" : undefined}
              className="flex min-h-12 items-center gap-3 rounded-xl px-3 font-medium hover:bg-paper-2 aria-[current=page]:bg-bottle aria-[current=page]:text-on-bottle"
            >
              <Wrench size={19} aria-hidden />
              Manage
              {!admin && (
                <span className="ml-auto flex items-center gap-1 text-xs text-ink-soft">
                  <Lock size={14} aria-hidden /> Admin only
                </span>
              )}
            </Link>
          </li>
        </ul>

        <div className="mt-auto border-t border-line p-4">
          {admin ? (
            <div className="flex items-center gap-3">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gilt font-display text-lg text-[#2a1f08]"
                aria-hidden
              >
                {admin.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold leading-tight">{admin.name}</p>
                <p className="truncate text-xs text-ink-soft">{admin.email}</p>
              </div>
              <form action={signOut}>
                <button type="submit" className="btn btn-outline btn-sm">
                  <LogOut size={15} aria-hidden /> Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link href={`/login?next=${encodeURIComponent(pathname.startsWith("/login") ? "/manage/lending" : pathname)}`} className="btn btn-outline w-full">
              <LogIn size={17} aria-hidden /> Admin login
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}

function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const current =
      root.dataset.theme ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("rb-theme", next);
    } catch {}
  };
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label="Switch light or dark theme">
      <Sun size={19} className="hidden dark:block" aria-hidden />
      <Moon size={19} className="dark:hidden" aria-hidden />
    </button>
  );
}

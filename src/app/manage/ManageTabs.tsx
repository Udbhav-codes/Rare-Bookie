"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookDown, BookPlus, BookUp, Library } from "lucide-react";

const TABS = [
  { href: "/manage/lending", label: "Lending", icon: BookUp },
  { href: "/manage/return", label: "Return", icon: BookDown },
  { href: "/manage/add", label: "Add", icon: BookPlus },
  { href: "/manage/collection", label: "Collection", icon: Library },
];

export function ManageTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Manage sections" className="no-print sticky top-16 z-30 -mx-4 border-b border-line bg-paper/90 px-4 backdrop-blur-md sm:-mx-6 sm:px-6">
      <ul className="scrollbar-thin flex gap-1 overflow-x-auto overflow-y-hidden">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="relative flex min-h-12 items-center gap-2 px-4 font-semibold text-ink-soft transition-colors hover:text-ink aria-[current=page]:text-ink"
              >
                <Icon size={17} aria-hidden />
                {label}
                {active && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-gilt" aria-hidden />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

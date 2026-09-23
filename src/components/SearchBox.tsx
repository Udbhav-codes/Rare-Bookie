"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { BookSummary } from "@/lib/types";
import { BookCover } from "./BookCover";
import { AvailabilityBadge } from "./Badges";

export function SearchBox() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<BookSummary[]>([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const listId = useId();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (!term) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        setResults(await res.json());
        setActive(-1);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 140);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node) && !q) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, q]);

  const close = () => {
    setOpen(false);
    setQ("");
    setResults([]);
  };

  const go = (href: string) => {
    close();
    router.push(href);
  };

  const shown = q.trim() ? results : [];

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && shown[active]) go(`/catalogue?book=${shown[active].id}`);
      else if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  };

  return (
    <div ref={wrapRef} className="relative flex items-center">
      <div
        className="flex items-center overflow-hidden rounded-full border-[1.5px] transition-[width,border-color,background-color] duration-300 ease-out"
        style={{
          width: open ? "min(26rem, calc(100vw - 8.5rem))" : 44,
          borderColor: open ? "var(--line-strong)" : "transparent",
          background: open ? "var(--card)" : "transparent",
        }}
      >
        <button
          type="button"
          className="icon-btn shrink-0"
          aria-label={open ? "Search" : "Open search"}
          aria-expanded={open}
          onClick={() => (open && q.trim() ? go(`/search?q=${encodeURIComponent(q.trim())}`) : setOpen(true))}
        >
          <Search size={19} aria-hidden />
        </button>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          tabIndex={open ? 0 : -1}
          placeholder="Title, author, ISBN or R5"
          aria-label="Search books"
          role="combobox"
          aria-expanded={shown.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          className="h-10 min-w-0 flex-1 bg-transparent pr-1 text-[0.95rem] outline-none placeholder:text-ink-soft/70"
        />
        {open && (
          <button type="button" className="icon-btn h-9 w-9 shrink-0" aria-label="Close search" onClick={close}>
            <X size={17} aria-hidden />
          </button>
        )}
      </div>

      {open && q.trim() && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-line bg-card shadow-lift">
          <ul id={listId} role="listbox" aria-label="Matching books">
            {shown.map((b, i) => (
              <li
                key={b.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(`/catalogue?book=${b.id}`);
                }}
                className="flex cursor-pointer items-center gap-3 px-3 py-2.5 aria-selected:bg-paper-2"
              >
                <BookCover book={b} size="xs" className="w-9 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold leading-tight">{b.title}</p>
                  <p className="truncate text-sm text-ink-soft">{b.author}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="rack-plate">{b.rack_number}</span>
                  <AvailabilityBadge available={b.available_copies} total={b.total_copies} />
                </div>
              </li>
            ))}
          </ul>
          {!loading && shown.length === 0 && (
            <p className="px-4 py-5 text-sm text-ink-soft">No books match “{q.trim()}”. Try an author’s surname or a rack like R5.</p>
          )}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              go(`/search?q=${encodeURIComponent(q.trim())}`);
            }}
            className="flex w-full items-center justify-between border-t border-line px-4 py-3 text-sm font-semibold hover:bg-paper-2"
          >
            See all results for “{q.trim()}”
            <kbd className="font-mono text-xs text-ink-soft">Enter ↵</kbd>
          </button>
        </div>
      )}
    </div>
  );
}

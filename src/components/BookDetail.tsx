"use client";

import { useEffect, useRef } from "react";
import { MapPin, X } from "lucide-react";
import type { Book } from "@/lib/types";
import { describeRack } from "@/lib/utils";
import { AvailabilityBadge } from "./Badges";
import { BookCover } from "./BookCover";
import { RackMap } from "./RackMap";

export function BookDetail({
  book,
  rackRows,
  onClose,
  footer,
}: {
  book: Book;
  rackRows: number;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>("a, button, input, select, textarea, [tabindex]:not([tabindex='-1'])");
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
  }, [onClose]);

  const meta: [string, string | number | null][] = [
    ["Category", book.category],
    ["ISBN", book.isbn],
    ["Publisher", book.publisher],
    ["Year", book.year],
    ["Language", book.language],
    ["Edition", book.edition],
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <div className="reveal absolute inset-0 bg-[#0b1020]/55 [animation-duration:200ms]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-detail-title"
        className="reveal relative max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-line bg-card shadow-lift [animation-duration:260ms] sm:rounded-3xl"
      >
        <button ref={closeRef} type="button" onClick={onClose} className="icon-btn absolute right-3 top-3 z-10 bg-card" aria-label="Close book details">
          <X size={20} aria-hidden />
        </button>
        <div className="grid gap-6 p-5 sm:grid-cols-[200px_1fr] sm:gap-8 sm:p-8">
          <div className="mx-auto w-40 sm:w-full">
            <BookCover book={book} size="lg" />
          </div>
          <div className="min-w-0">
            <p className="label-mono text-gilt-ink">{book.category ?? "Uncategorised"}</p>
            <h2 id="book-detail-title" className="display mt-2 pr-8 text-3xl sm:text-4xl">
              {book.title}
            </h2>
            <p className="mt-2 text-lg text-ink-soft">{book.author}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <AvailabilityBadge available={book.available_copies} total={book.total_copies} />
              <span className="text-sm text-ink-soft">
                {book.available_copies} of {book.total_copies} {book.total_copies === 1 ? "copy" : "copies"} on the shelf
              </span>
            </div>
            {book.description && <p className="mt-5 leading-relaxed">{book.description}</p>}
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              {meta
                .filter(([, v]) => v !== null && v !== "")
                .map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <dt className="text-ink-soft">{k}</dt>
                    <dd className="truncate font-medium">{v}</dd>
                  </div>
                ))}
            </dl>
          </div>
        </div>
        <div className="flex flex-col gap-5 border-t border-line bg-paper-2/50 p-5 sm:flex-row sm:items-center sm:p-8">
          <div className="sm:w-64">
            <p className="flex items-center gap-2 font-semibold">
              <MapPin size={17} className="text-gilt-ink" aria-hidden /> Find it in <span className="rack-plate text-sm">{book.rack_number}</span>
            </p>
            <p className="mt-1 text-sm text-ink-soft">{describeRack(book.rack_number)} of the rack.</p>
          </div>
          <RackMap rows={rackRows} variant="mini" highlight={book.rack_number} className="w-full max-w-72 sm:ml-auto" />
        </div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line p-4">{footer}</div>}
      </div>
    </div>
  );
}

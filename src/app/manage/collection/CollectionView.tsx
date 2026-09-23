"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Download, Eye, History, LayoutGrid, Pencil, Printer, Rows3, Search, Trash2 } from "lucide-react";
import { deleteBook } from "@/app/actions/books";
import { AvailabilityBadge } from "@/components/Badges";
import { BookCard } from "@/components/BookCard";
import { BookCover } from "@/components/BookCover";
import { BookDetail } from "@/components/BookDetail";
import { Notice } from "@/components/form";
import { useBookModal, useUrlState } from "@/components/useUrlState";
import type { ActionState, Book, Category } from "@/lib/types";
import { isbnMatch, rackLabels } from "@/lib/utils";

type SortKey = "title" | "author" | "rack" | "available" | "newest";

export function CollectionView({ books, categories, rackRows }: { books: Book[]; categories: Category[]; rackRows: number }) {
  const { params, set } = useUrlState();
  const { openId, open, close } = useBookModal();
  const [q, setQ] = useState("");
  const [confirming, setConfirming] = useState<Book | null>(null);
  const [delState, delAction, deleting] = useActionState<ActionState, FormData>(deleteBook, {});

  const view = params.get("view") === "grid" ? "grid" : "table";
  const category = params.get("cat") ?? "";
  const rack = params.get("rack") ?? "";
  const avail = params.get("avail") ?? "";
  const sort = (params.get("sort") as SortKey) || "title";

  // Close the confirm dialog once a delete attempt finishes (each result is a new object).
  const [seenDelState, setSeenDelState] = useState(delState);
  if (delState !== seenDelState) {
    setSeenDelState(delState);
    setConfirming(null);
  }

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = books.filter((b) => {
      if (category && String(b.category_id ?? "") !== category) return false;
      if (rack && b.rack_number !== rack) return false;
      if (avail === "in" && b.available_copies === 0) return false;
      if (avail === "out" && b.available_copies > 0) return false;
      if (!term) return true;
      return (
        b.title.toLowerCase().includes(term) ||
        b.author.toLowerCase().includes(term) ||
        isbnMatch(b.isbn, term) ||
        b.rack_number.toLowerCase() === term
      );
    });
    const rackNum = (r: string) => Number(r.slice(1)) || 0;
    const cmp: Record<SortKey, (a: Book, b: Book) => number> = {
      title: (a, b) => a.title.localeCompare(b.title),
      author: (a, b) => a.author.localeCompare(b.author),
      rack: (a, b) => rackNum(a.rack_number) - rackNum(b.rack_number) || a.title.localeCompare(b.title),
      available: (a, b) => a.available_copies - b.available_copies || a.title.localeCompare(b.title),
      newest: (a, b) => b.created_at.localeCompare(a.created_at),
    };
    return list.sort(cmp[sort] ?? cmp.title);
  }, [books, q, category, rack, avail, sort]);

  const selected = openId ? books.find((b) => b.id === openId) : undefined;

  return (
    <section aria-labelledby="col-h">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="col-h" className="display text-3xl">
            Collection
          </h2>
          <p className="mt-1 text-ink-soft">
            {books.length} titles · {books.reduce((n, b) => n + b.total_copies, 0)} copies
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <a href="/api/export" className="btn btn-outline btn-sm">
            <Download size={15} aria-hidden /> Export CSV
          </a>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => window.print()}>
            <Printer size={15} aria-hidden /> Print list
          </button>
          <Link href="/manage/add" className="btn btn-primary btn-sm">
            Add a book
          </Link>
        </div>
      </div>

      <div className="mt-4">
        <Notice state={delState} />
      </div>

      <div className="no-print mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden />
          <input className="field min-h-10 py-1.5 pl-9 text-sm" placeholder="Search title, author, ISBN or rack" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the collection" />
        </div>
        <select className="field w-auto min-h-10 py-1.5 text-sm" value={category} onChange={(e) => set({ cat: e.target.value || null })} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="field w-auto min-h-10 py-1.5 text-sm" value={rack} onChange={(e) => set({ rack: e.target.value || null })} aria-label="Rack">
          <option value="">All racks</option>
          {rackLabels(rackRows).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select className="field w-auto min-h-10 py-1.5 text-sm" value={avail} onChange={(e) => set({ avail: e.target.value || null })} aria-label="Availability">
          <option value="">Any availability</option>
          <option value="in">Available</option>
          <option value="out">All copies lent</option>
        </select>
        <select className="field w-auto min-h-10 py-1.5 text-sm" value={sort} onChange={(e) => set({ sort: e.target.value === "title" ? null : e.target.value })} aria-label="Sort">
          <option value="title">Title A–Z</option>
          <option value="author">Author A–Z</option>
          <option value="rack">Rack order</option>
          <option value="available">Fewest available</option>
          <option value="newest">Newest first</option>
        </select>
        <div className="flex rounded-full bg-paper-2 p-1" role="group" aria-label="Layout">
          <button type="button" className="grid h-8 w-9 place-items-center rounded-full aria-pressed:bg-card aria-pressed:shadow-card" aria-pressed={view === "table"} aria-label="Table view" onClick={() => set({ view: null })}>
            <Rows3 size={16} aria-hidden />
          </button>
          <button type="button" className="grid h-8 w-9 place-items-center rounded-full aria-pressed:bg-card aria-pressed:shadow-card" aria-pressed={view === "grid"} aria-label="Grid view" onClick={() => set({ view: "grid" })}>
            <LayoutGrid size={16} aria-hidden />
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm text-ink-soft" aria-live="polite">
        Showing {rows.length} of {books.length}
      </p>

      {view === "table" ? (
        <div className="card mt-3 overflow-x-auto">
          <table className="table min-w-[860px]">
            <thead>
              <tr>
                <th className="w-12">
                  <span className="sr-only">Cover</span>
                </th>
                <th>Title</th>
                <th>Category</th>
                <th>Rack</th>
                <th className="text-right">Total</th>
                <th className="text-right">In</th>
                <th>Status</th>
                <th className="no-print text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id}>
                  <td>
                    <BookCover book={b} size="xs" className="w-9" />
                  </td>
                  <td>
                    <p className="font-semibold leading-tight">{b.title}</p>
                    <p className="text-sm text-ink-soft">{b.author}</p>
                  </td>
                  <td className="text-sm">{b.category ?? <span className="text-ink-soft">—</span>}</td>
                  <td>
                    <span className="rack-plate">{b.rack_number}</span>
                  </td>
                  <td className="text-right font-mono">{b.total_copies}</td>
                  <td className="text-right font-mono">{b.available_copies}</td>
                  <td>
                    <AvailabilityBadge available={b.available_copies} total={b.total_copies} />
                  </td>
                  <td className="no-print">
                    <RowActions book={b} onView={() => open(b.id)} onDelete={() => setConfirming(b)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-8 text-center text-ink-soft">No books match. Change the search or filters.</p>}
        </div>
      ) : (
        <ul className="-mx-2 mt-3 grid grid-cols-2 gap-x-2 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {rows.map((b) => (
            <li key={b.id} className="flex flex-col">
              <BookCard book={b} onOpen={open} />
              <div className="no-print px-2">
                <RowActions book={b} onView={() => open(b.id)} onDelete={() => setConfirming(b)} compact />
              </div>
            </li>
          ))}
          {rows.length === 0 && <li className="col-span-full p-8 text-center text-ink-soft">No books match. Change the search or filters.</li>}
        </ul>
      )}

      {selected && (
        <BookDetail
          book={selected}
          rackRows={rackRows}
          onClose={close}
          footer={
            <>
              <Link href={`/manage/collection/${selected.id}/history`} className="btn btn-ghost btn-sm">
                <History size={15} aria-hidden /> Loan history
              </Link>
              <Link href={`/manage/collection/${selected.id}/edit`} className="btn btn-primary btn-sm">
                <Pencil size={15} aria-hidden /> Edit
              </Link>
            </>
          }
        />
      )}

      {confirming && (
        <ConfirmDelete book={confirming} pending={deleting} action={delAction} onCancel={() => setConfirming(null)} />
      )}
    </section>
  );
}

function RowActions({ book, onView, onDelete, compact }: { book: Book; onView: () => void; onDelete: () => void; compact?: boolean }) {
  const cls = compact ? "icon-btn h-9 w-9" : "icon-btn h-9 w-9";
  return (
    <div className={`flex items-center ${compact ? "gap-0" : "justify-end gap-0.5"}`}>
      <button type="button" className={cls} onClick={onView} aria-label={`View ${book.title}`} title="View">
        <Eye size={16} aria-hidden />
      </button>
      <Link href={`/manage/collection/${book.id}/edit`} className={cls} aria-label={`Edit ${book.title}`} title="Edit">
        <Pencil size={16} aria-hidden />
      </Link>
      <Link href={`/manage/collection/${book.id}/history`} className={cls} aria-label={`Loan history for ${book.title}`} title="Loan history">
        <History size={16} aria-hidden />
      </Link>
      <button type="button" className={`${cls} text-bad`} onClick={onDelete} aria-label={`Delete ${book.title}`} title="Delete">
        <Trash2 size={16} aria-hidden />
      </button>
    </div>
  );
}

function ConfirmDelete({ book, pending, action, onCancel }: { book: Book; pending: boolean; action: (fd: FormData) => void; onCancel: () => void }) {
  const out = book.total_copies - book.available_copies;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4">
      <div className="absolute inset-0 bg-[#0b1020]/55" onClick={onCancel} aria-hidden />
      <form action={action} role="alertdialog" aria-modal="true" aria-labelledby="del-h" aria-describedby="del-d" className="card reveal relative w-full max-w-md p-6">
        <input type="hidden" name="id" value={book.id} />
        <h3 id="del-h" className="display text-2xl">
          Delete “{book.title}”?
        </h3>
        <p id="del-d" className="mt-2 text-ink-soft">
          {out > 0
            ? `${out} ${out === 1 ? "copy is" : "copies are"} lent out, so this book can't be deleted until ${out === 1 ? "it's" : "they're"} returned.`
            : `This removes all ${book.total_copies} ${book.total_copies === 1 ? "copy" : "copies"} from the catalogue. Past loans stay in the history. This can't be undone.`}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel} autoFocus>
            Cancel
          </button>
          <button type="submit" className="btn btn-danger" disabled={pending || out > 0}>
            {pending ? "Deleting…" : "Delete book"}
          </button>
        </div>
      </form>
    </div>
  );
}

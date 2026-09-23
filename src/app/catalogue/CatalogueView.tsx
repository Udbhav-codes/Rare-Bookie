"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { BookCard } from "@/components/BookCard";
import { BookDetail } from "@/components/BookDetail";
import { RackMap } from "@/components/RackMap";
import { useBookModal, useUrlState } from "@/components/useUrlState";
import type { Book, Category } from "@/lib/types";
import { describeRack, rackLabels } from "@/lib/utils";

type Sort = "az" | "newest" | "popular";

const SORTERS: Record<Sort, (a: Book, b: Book) => number> = {
  az: (a, b) => a.title.localeCompare(b.title),
  newest: (a, b) => b.created_at.localeCompare(a.created_at),
  popular: (a, b) => b.borrow_count - a.borrow_count || a.title.localeCompare(b.title),
};

export function CatalogueView({ books, categories, rackRows }: { books: Book[]; categories: Category[]; rackRows: number }) {
  const { params, set } = useUrlState();
  const { openId, open, close } = useBookModal();

  const category = params.get("cat") ?? "";
  const rack = (params.get("rack") ?? "").toUpperCase();
  const sort = (["az", "newest", "popular"].includes(params.get("sort") ?? "") ? params.get("sort") : "az") as Sort;
  const availableOnly = params.get("available") === "1";

  const filtered = useMemo(
    () =>
      books
        .filter((b) => !category || b.category === category)
        .filter((b) => !rack || b.rack_number.toUpperCase() === rack)
        .filter((b) => !availableOnly || b.available_copies > 0)
        .sort(SORTERS[sort]),
    [books, category, rack, availableOnly, sort],
  );

  // Group under category headings unless the reader already picked one category.
  const groups = useMemo(() => {
    if (category) return [[category, filtered] as const];
    const map = new Map<string, Book[]>();
    for (const b of filtered) {
      const key = b.category ?? "Uncategorised";
      map.set(key, [...(map.get(key) ?? []), b]);
    }
    return [...map].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, category]);

  const selected = openId ? books.find((b) => b.id === openId) : undefined;
  const hasFilters = category || rack || availableOnly;
  const counts = new Map(categories.map((c) => [c.name, c.book_count]));

  return (
    <>
      <div className="sticky top-16 z-30 -mx-4 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="scrollbar-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by category">
          <button type="button" className="chip" aria-pressed={!category} onClick={() => set({ cat: null })}>
            All <span className="count">{books.length}</span>
          </button>
          {categories
            .filter((c) => c.book_count > 0)
            .map((c) => (
              <button key={c.id} type="button" className="chip" aria-pressed={category === c.name} onClick={() => set({ cat: c.name })}>
                {c.name} <span className="count">{counts.get(c.name)}</span>
              </button>
            ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="rack-filter">
            Rack
          </label>
          <select id="rack-filter" className="field w-auto min-h-10 py-1.5 text-sm" value={rack} onChange={(e) => set({ rack: e.target.value || null })}>
            <option value="">All racks</option>
            {rackLabels(rackRows).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="sort">
            Sort
          </label>
          <select id="sort" className="field w-auto min-h-10 py-1.5 text-sm" value={sort} onChange={(e) => set({ sort: e.target.value === "az" ? null : e.target.value })}>
            <option value="az">Title A–Z</option>
            <option value="newest">Newest first</option>
            <option value="popular">Most borrowed</option>
          </select>
          <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full px-3 text-sm font-medium hover:bg-paper-2">
            <input type="checkbox" className="h-4 w-4 accent-[var(--bottle)]" checked={availableOnly} onChange={(e) => set({ available: e.target.checked ? "1" : null })} />
            Available only
          </label>
          {hasFilters && (
            <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={() => set({ cat: null, rack: null, available: null })}>
              <X size={15} aria-hidden /> Clear filters
            </button>
          )}
        </div>
      </div>

      {rack && (
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-line bg-card p-4 sm:flex-row sm:items-center">
          <RackMap rows={rackRows} variant="mini" highlight={rack} className="w-full max-w-60" />
          <div>
            <p className="font-semibold">
              Showing compartment <span className="rack-plate">{rack}</span>
            </p>
            <p className="text-sm text-ink-soft">{describeRack(rack)} of the rack.</p>
          </div>
        </div>
      )}

      <p className="mt-6 text-sm text-ink-soft" aria-live="polite">
        {filtered.length === books.length ? `${books.length} books` : `${filtered.length} of ${books.length} books`}
      </p>

      {filtered.length === 0 ? (
        <div className="card mt-4 p-10 text-center">
          <p className="display text-2xl">Nothing on this shelf</p>
          <p className="mt-2 text-ink-soft">No books match these filters. Clear them to see the whole catalogue.</p>
          <button type="button" className="btn btn-outline mt-5" onClick={() => set({ cat: null, rack: null, available: null })}>
            Clear filters
          </button>
        </div>
      ) : (
        groups.map(([name, list]) => (
          <section key={name} className="mt-8" aria-labelledby={`cat-${name}`}>
            <div className="mb-3 flex items-baseline gap-3 border-b border-line pb-2">
              <h2 id={`cat-${name}`} className="display text-2xl sm:text-3xl">
                {name}
              </h2>
              <span className="font-mono text-sm text-ink-soft">{list.length}</span>
            </div>
            <ul className="-mx-2 grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {list.map((b) => (
                <li key={b.id}>
                  <BookCard book={b} onOpen={open} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {selected && <BookDetail book={selected} rackRows={rackRows} onClose={close} />}
    </>
  );
}

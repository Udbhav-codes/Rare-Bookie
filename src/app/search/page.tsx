import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { getBooks, getLibrarySettings, searchBooks } from "@/lib/data";
import { SearchResults } from "./SearchResults";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q: raw } = await searchParams;
  const q = (Array.isArray(raw) ? raw[0] : (raw ?? "")).trim().slice(0, 100);
  const [matches, books, { rackRows }] = await Promise.all([searchBooks(q, 200), getBooks(), getLibrarySettings()]);
  const byId = new Map(books.map((b) => [b.id, b]));
  const results = matches.map((m) => byId.get(m.id)!).filter(Boolean);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6">
      <PageHeader eyebrow={`${results.length} result${results.length === 1 ? "" : "s"}`} title={q ? `“${q}”` : "Search"} />
      {results.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="display text-2xl">No books found</p>
          <p className="mt-2 text-ink-soft">Search by title, author, ISBN, category, or a rack number like R5.</p>
          <Link href="/catalogue" className="btn btn-outline mt-5">
            Browse the catalogue
          </Link>
        </div>
      ) : (
        <Suspense>
          <SearchResults books={results} rackRows={rackRows} />
        </Suspense>
      )}
    </div>
  );
}

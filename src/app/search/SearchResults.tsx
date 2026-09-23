"use client";

import { BookCard } from "@/components/BookCard";
import { BookDetail } from "@/components/BookDetail";
import { useBookModal } from "@/components/useUrlState";
import type { Book } from "@/lib/types";

export function SearchResults({ books, rackRows }: { books: Book[]; rackRows: number }) {
  const { openId, open, close } = useBookModal();
  const selected = openId ? books.find((b) => b.id === openId) : undefined;
  return (
    <>
      <ul className="-mx-2 grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {books.map((b) => (
          <li key={b.id}>
            <BookCard book={b} onOpen={open} />
          </li>
        ))}
      </ul>
      {selected && <BookDetail book={selected} rackRows={rackRows} onClose={close} />}
    </>
  );
}

import type { Book } from "@/lib/types";
import { AvailabilityBadge } from "./Badges";
import { BookCover } from "./BookCover";

export function BookCard({ book, onOpen }: { book: Book; onOpen: (id: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(book.id)}
      className="group flex h-full w-full flex-col rounded-xl p-2 text-left transition-colors hover:bg-card focus-visible:bg-card"
      aria-label={`${book.title} by ${book.author}, rack ${book.rack_number}. Show details`}
    >
      <BookCover book={book} className="w-full transition-transform duration-200 group-hover:-translate-y-1" />
      <p className="mt-3 line-clamp-2 font-semibold leading-snug">{book.title}</p>
      <p className="truncate text-sm text-ink-soft">{book.author}</p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2.5">
        <span className="rack-plate">{book.rack_number}</span>
        <AvailabilityBadge available={book.available_copies} total={book.total_copies} />
      </div>
    </button>
  );
}

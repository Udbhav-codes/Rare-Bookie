"use client";

import { useActionState, useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { issueBook } from "@/app/actions/loans";
import { BookCover } from "@/components/BookCover";
import { errProps, Field, FormErrorsSummary, Notice, submitWith } from "@/components/form";
import type { ActionState, BookSummary } from "@/lib/types";
import { addDays, isbnMatch, todayISO } from "@/lib/utils";

export function LendForm({ books, loanDays }: { books: BookSummary[]; loanDays: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(issueBook, {});
  // Remount the form fields after each successful issue so they clear.
  return (
    <div className="mt-6 space-y-4">
      <Notice state={state} />
      <FormErrorsSummary state={state} />
      <LendFields key={state.stamp ?? 0} books={books} loanDays={loanDays} state={state} action={action} pending={pending} />
    </div>
  );
}

function LendFields({
  books,
  loanDays,
  state,
  action,
  pending,
}: {
  books: BookSummary[];
  loanDays: number;
  state: ActionState;
  action: (fd: FormData) => void;
  pending: boolean;
}) {
  const [lend, setLend] = useState(todayISO());
  const [due, setDue] = useState(addDays(todayISO(), loanDays));
  const [dueTouched, setDueTouched] = useState(false);

  return (
    <form onSubmit={submitWith(action)} className="card space-y-5 p-5 sm:p-6" noValidate>
      <BookPicker books={books} error={state.errors?.book_id} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Borrower name" error={state.errors?.name} className="sm:col-span-2">
          <input id="name" name="name" className="field" autoComplete="off" {...errProps(state, "name")} />
        </Field>
        <Field id="member_id" label="Member / ID no." optional error={state.errors?.member_id} className="sm:col-span-2">
          <input id="member_id" name="member_id" className="field" placeholder="e.g. M-1024" />
        </Field>
        <Field id="lend_date" label="Date of lending" error={state.errors?.lend_date}>
          <input
            id="lend_date"
            name="lend_date"
            type="date"
            className="field"
            value={lend}
            onChange={(e) => {
              setLend(e.target.value);
              if (!dueTouched && e.target.value) setDue(addDays(e.target.value, loanDays));
            }}
            {...errProps(state, "lend_date")}
          />
        </Field>
        <Field id="due_date" label="Due date" error={state.errors?.due_date} help={`${loanDays} days after lending unless you change it.`}>
          <input
            id="due_date"
            name="due_date"
            type="date"
            className="field"
            value={due}
            min={lend}
            onChange={(e) => {
              setDue(e.target.value);
              setDueTouched(true);
            }}
            {...errProps(state, "due_date")}
          />
        </Field>
        <Field id="notes" label="Notes / condition at issue" optional className="sm:col-span-2">
          <textarea id="notes" name="notes" className="field" rows={2} placeholder="e.g. Spine slightly worn" />
        </Field>
      </div>
      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary" disabled={pending || books.length === 0}>
          {pending ? "Issuing…" : "Issue book"}
        </button>
      </div>
    </form>
  );
}

function BookPicker({ books, error }: { books: BookSummary[]; error?: string }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<BookSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? books.filter(
          (b) =>
            b.title.toLowerCase().includes(q) ||
            b.author.toLowerCase().includes(q) ||
            isbnMatch(b.isbn, q) ||
            b.rack_number.toLowerCase() === q,
        )
      : books;
    return list.slice(0, 8);
  }, [books, query]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const choose = (b: BookSummary) => {
    setSelected(b);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={wrapRef}>
      <label htmlFor="book-search" className="field-label">
        Book
      </label>
      <input type="hidden" name="book_id" value={selected?.id ?? ""} />
      {selected ? (
        <div className="flex items-center gap-3 rounded-xl border-[1.5px] border-bottle bg-card p-2.5">
          <BookCover book={selected} size="xs" className="w-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">{selected.title}</p>
            <p className="truncate text-sm text-ink-soft">{selected.author}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="rack-plate">{selected.rack_number}</span>
            <span className="text-xs text-ink-soft">
              {selected.available_copies} of {selected.total_copies} left
            </span>
          </div>
          <button
            type="button"
            className="icon-btn shrink-0"
            aria-label="Change book"
            onClick={() => {
              setSelected(null);
              setTimeout(() => inputRef.current?.focus());
            }}
          >
            <X size={18} aria-hidden />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden />
          <input
            ref={inputRef}
            id="book-search"
            className="field pl-9"
            placeholder={books.length ? "Search by title, author, ISBN or rack" : "No books are available to lend"}
            disabled={books.length === 0}
            value={query}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
            aria-invalid={!!error}
            aria-describedby={error ? "book_id-err" : undefined}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
                setActive((a) => Math.min(a + 1, matches.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (open && matches[active]) choose(matches[active]);
              } else if (e.key === "Escape") setOpen(false);
            }}
          />
          {open && (
            <ul id={listId} role="listbox" className="absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-80 overflow-y-auto rounded-xl border border-line bg-card shadow-lift">
              {matches.map((b, i) => (
                <li
                  key={b.id}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(b);
                  }}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 aria-selected:bg-paper-2"
                >
                  <BookCover book={b} size="xs" className="w-8 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{b.title}</p>
                    <p className="truncate text-xs text-ink-soft">{b.author}</p>
                  </div>
                  <span className="rack-plate">{b.rack_number}</span>
                </li>
              ))}
              {matches.length === 0 && <li className="px-4 py-3 text-sm text-ink-soft">No available book matches “{query}”.</li>}
            </ul>
          )}
        </div>
      )}
      {error && (
        <p id="book_id-err" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

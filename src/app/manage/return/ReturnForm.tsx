"use client";

import { useActionState, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { returnBook } from "@/app/actions/loans";
import { LoanStatusBadge } from "@/components/Badges";
import { BookCover } from "@/components/BookCover";
import { errProps, Field, FormErrorsSummary, Notice, submitWith } from "@/components/form";
import type { ActionState, AdminLoan } from "@/lib/types";
import { daysBetween, formatDate, todayISO } from "@/lib/utils";

export function ReturnForm({ loans, initialLoanId }: { loans: AdminLoan[]; initialLoanId: number | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(returnBook, {});
  return (
    <div className="mt-6 space-y-4">
      <Notice state={state} />
      <FormErrorsSummary state={state} />
      <ReturnFields
        key={`${state.stamp ?? 0}-${initialLoanId}`}
        loans={loans}
        initialLoanId={state.stamp ? null : initialLoanId}
        state={state}
        action={action}
        pending={pending}
      />
    </div>
  );
}

function ReturnFields({
  loans,
  initialLoanId,
  state,
  action,
  pending,
}: {
  loans: AdminLoan[];
  initialLoanId: number | null;
  state: ActionState;
  action: (fd: FormData) => void;
  pending: boolean;
}) {
  const [query, setQuery] = useState("");
  const [loanId, setLoanId] = useState<number | null>(loans.some((l) => l.id === initialLoanId) ? initialLoanId : null);
  const [returnDate, setReturnDate] = useState(todayISO());

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return loans;
    const digits = q.replace(/\D/g, "");
    return loans.filter(
      (l) =>
        l.borrower_name.toLowerCase().includes(q) ||
        l.book_title.toLowerCase().includes(q) ||
        (l.member_id ?? "").toLowerCase().includes(q) ||
        (digits.length >= 3 && l.phone.replace(/\D/g, "").includes(digits)),
    );
  }, [loans, query]);

  const loan = loans.find((l) => l.id === loanId);
  const overdueDays = loan && returnDate ? Math.max(0, daysBetween(loan.due_date, returnDate)) : 0;

  if (loans.length === 0) {
    return <p className="card p-8 text-center text-ink-soft">No books are out right now, so there’s nothing to return.</p>;
  }

  return (
    <form onSubmit={submitWith(action)} className="card space-y-5 p-5 sm:p-6" noValidate>
      <input type="hidden" name="loan_id" value={loanId ?? ""} />

      <div>
        <label htmlFor="loan-search" className="field-label">
          Search lent records
        </label>
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden />
          <input
            id="loan-search"
            className="field pl-9"
            placeholder="Borrower, member no. or book"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-invalid={!!state.errors?.loan_id}
            aria-describedby={state.errors?.loan_id ? "loan_id-err" : undefined}
          />
        </div>
        <fieldset className="mt-3">
          <legend className="sr-only">Active loans</legend>
          <ul className="scrollbar-thin max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {matches.map((l) => (
              <li key={l.id}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-[1.5px] p-2.5 transition-colors ${
                    l.id === loanId ? "border-bottle bg-paper-2/70" : "border-line hover:border-line-strong"
                  }`}
                >
                  <input type="radio" name="loan_pick" className="sr-only" checked={l.id === loanId} onChange={() => setLoanId(l.id)} />
                  <BookCover book={{ id: l.book_id ?? l.id, title: l.book_title, author: l.author ?? "", cover_url: l.cover_url, isbn: l.isbn }} size="xs" className="w-8 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{l.book_title}</span>
                    <span className="block truncate text-xs text-ink-soft">
                      {[l.borrower_name, l.member_id || l.phone].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <LoanStatusBadge due={l.due_date} />
                </label>
              </li>
            ))}
            {matches.length === 0 && <li className="px-2 py-3 text-sm text-ink-soft">No active loan matches “{query}”.</li>}
          </ul>
        </fieldset>
        {state.errors?.loan_id && (
          <p id="loan_id-err" className="field-error">
            {state.errors.loan_id}
          </p>
        )}
      </div>

      {loan && (
        <div className="reveal space-y-5 border-t border-line pt-5">
          <dl className="grid grid-cols-2 gap-4 rounded-xl bg-paper-2/60 p-4 text-sm sm:grid-cols-4">
            <div className="col-span-2">
              <dt className="text-ink-soft">Book</dt>
              <dd className="font-semibold">
                {loan.book_title} {loan.rack_number && <span className="rack-plate ml-1">{loan.rack_number}</span>}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-ink-soft">Borrower</dt>
              <dd className="font-semibold">
                {loan.borrower_name}
                {loan.member_id && <span className="ml-1 font-mono text-xs font-normal text-ink-soft">{loan.member_id}</span>}
              </dd>
            </div>
            <div>
              <dt className="text-ink-soft">Lent on</dt>
              <dd>{formatDate(loan.lend_date)}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Due</dt>
              <dd>{formatDate(loan.due_date)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-ink-soft">Days overdue</dt>
              <dd className={overdueDays > 0 ? "font-bold text-bad" : "font-semibold text-ok"}>
                {overdueDays > 0 ? `${overdueDays} day${overdueDays === 1 ? "" : "s"}` : "None — returned on time"}
              </dd>
            </div>
            {loan.notes && (
              <div className="col-span-full">
                <dt className="text-ink-soft">Notes at issue</dt>
                <dd>{loan.notes}</dd>
              </div>
            )}
          </dl>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="return_date" label="Return date" error={state.errors?.return_date}>
              <input
                id="return_date"
                name="return_date"
                type="date"
                className="field"
                value={returnDate}
                min={loan.lend_date}
                onChange={(e) => setReturnDate(e.target.value)}
                {...errProps(state, "return_date")}
              />
            </Field>
            <Field id="condition" label="Condition on return" error={state.errors?.condition} help="Lost copies are removed from the collection.">
              <select id="condition" name="condition" className="field" defaultValue="Good" {...errProps(state, "condition")}>
                <option value="Good">Good</option>
                <option value="Damaged">Damaged</option>
                <option value="Lost">Lost</option>
              </select>
            </Field>
            <Field id="remarks" label="Remarks" optional className="sm:col-span-2">
              <textarea id="remarks" name="remarks" className="field" rows={2} />
            </Field>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? "Saving…" : "Mark as returned"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

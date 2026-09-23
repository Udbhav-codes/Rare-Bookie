import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { getActiveLoans } from "@/lib/data";
import { daysBetween, formatDate, loanStatus, todayISO } from "@/lib/utils";
import { ReturnForm } from "./ReturnForm";

export const metadata: Metadata = { title: "Return" };

export default async function ReturnPage({ searchParams }: PageProps<"/manage/return">) {
  const { loan } = await searchParams;
  const loans = getActiveLoans();
  const today = todayISO();
  const overdue = loans.filter((l) => loanStatus(l.due_date, today) === "overdue");

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <section aria-labelledby="ret-h">
        <h2 id="ret-h" className="display text-3xl">
          Return a book
        </h2>
        <p className="mt-1 text-ink-soft">Find the loan by borrower name, member number or book title.</p>
        <ReturnForm loans={loans} initialLoanId={Number(loan) || null} />
      </section>

      <section aria-labelledby="od-h">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="od-h" className="display text-3xl">
            Overdue
          </h2>
          <span className={`font-mono text-sm ${overdue.length ? "text-bad" : "text-ink-soft"}`}>{overdue.length}</span>
        </div>
        <p className="mt-1 text-ink-soft">Borrowers to follow up with.</p>
        <ul className="mt-4 space-y-3">
          {overdue.map((l) => {
            const late = daysBetween(l.due_date, today);
            return (
              <li key={l.id} className="card border-l-4 border-l-bad p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight">{l.book_title}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      Due {formatDate(l.due_date)} ·{" "}
                      <span className="font-semibold text-bad">
                        {late} day{late === 1 ? "" : "s"} late
                      </span>
                    </p>
                  </div>
                  <Link href={`/manage/return?loan=${l.id}`} scroll={false} className="btn btn-outline btn-sm shrink-0">
                    Return
                  </Link>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-sm">
                  <span className="font-semibold">{l.borrower_name}</span>
                  {l.member_id && <span className="font-mono text-xs text-ink-soft">{l.member_id}</span>}
                  {l.phone && (
                    <a href={`tel:${l.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 hover:underline">
                      <Phone size={14} aria-hidden /> {l.phone}
                    </a>
                  )}
                  {l.email && (
                    <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1.5 hover:underline">
                      <Mail size={14} aria-hidden /> {l.email}
                    </a>
                  )}
                </div>
              </li>
            );
          })}
          {overdue.length === 0 && <li className="card p-6 text-center text-ink-soft">Nothing is overdue. Nice.</li>}
        </ul>
      </section>
    </div>
  );
}

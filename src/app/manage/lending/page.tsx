import type { Metadata } from "next";
import { LoanStatusBadge } from "@/components/Badges";
import { getActiveLoans, getBooks, getLibrarySettings } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { LendForm } from "./LendForm";

export const metadata: Metadata = { title: "Lending" };

export default async function LendingPage() {
  const books = (await getBooks())
    .filter((b) => b.available_copies > 0)
    .map(({ id, title, author, isbn, cover_url, rack_number, available_copies, total_copies }) => ({
      id,
      title,
      author,
      isbn,
      cover_url,
      rack_number,
      available_copies,
      total_copies,
    }));
  const [loans, { loanDays }] = await Promise.all([getActiveLoans(), getLibrarySettings()]);

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <section aria-labelledby="lend-h">
        <h2 id="lend-h" className="display text-3xl">
          Issue a book
        </h2>
        <p className="mt-1 text-ink-soft">Only books with a copy on the shelf are listed. New loans default to {loanDays} days.</p>
        <LendForm books={books} loanDays={loanDays} />
      </section>

      <section aria-labelledby="out-h">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="out-h" className="display text-3xl">
            Currently lent
          </h2>
          <span className="font-mono text-sm text-ink-soft">{loans.length}</span>
        </div>
        <div className="card mt-4 overflow-x-auto">
          <table className="table min-w-[560px]">
            <thead>
              <tr>
                <th>Book</th>
                <th>Borrower</th>
                <th>Lent</th>
                <th>Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((l) => (
                <tr key={l.id}>
                  <td>
                    <p className="font-semibold leading-tight">{l.book_title}</p>
                    {l.rack_number && <span className="rack-plate mt-1">{l.rack_number}</span>}
                  </td>
                  <td>
                    <p className="leading-tight">{l.borrower_name}</p>
                    {(l.member_id || l.phone) && (
                      <p className="whitespace-nowrap font-mono text-xs text-ink-soft">{l.member_id || l.phone}</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap">{formatDate(l.lend_date)}</td>
                  <td className="whitespace-nowrap">{formatDate(l.due_date)}</td>
                  <td>
                    <LoanStatusBadge due={l.due_date} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loans.length === 0 && <p className="p-8 text-center text-ink-soft">No books are out right now.</p>}
        </div>
      </section>
    </div>
  );
}

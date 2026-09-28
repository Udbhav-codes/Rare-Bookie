import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LoanStatusBadge } from "@/components/Badges";
import { BookCover } from "@/components/BookCover";
import { PageHeader } from "@/components/PageHeader";
import { getBook, getLoansForBook } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Loan history" };

export default async function BookHistoryPage({ params }: PageProps<"/manage/collection/[id]/history">) {
  const { id } = await params;
  const book = await getBook(Number(id));
  if (!book) notFound();
  const loans = await getLoansForBook(book.id);

  return (
    <section>
      <PageHeader eyebrow="Loan history" title={book.title} back={{ href: "/manage/collection", label: "Collection" }}>
        <Link href={`/manage/collection/${book.id}/edit`} className="btn btn-outline btn-sm">
          Edit book
        </Link>
      </PageHeader>
      <div className="mb-6 flex items-center gap-4">
        <BookCover book={book} className="w-14" size="xs" />
        <div className="text-sm">
          <p className="font-semibold">{book.author}</p>
          <p className="text-ink-soft">
            <span className="rack-plate">{book.rack_number}</span> · {book.available_copies} of {book.total_copies} on the shelf ·{" "}
            {loans.length} loan{loans.length === 1 ? "" : "s"} in total
          </p>
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="table min-w-[720px]">
          <thead>
            <tr>
              <th>Borrower</th>
              <th>Lent</th>
              <th>Due</th>
              <th>Returned</th>
              <th>Condition</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((l) => (
              <tr key={l.id}>
                <td>
                  <p className="font-semibold leading-tight">{l.borrower_name}</p>
                  {l.phone && <p className="whitespace-nowrap font-mono text-xs text-ink-soft">{l.phone}</p>}
                </td>
                <td className="whitespace-nowrap">{formatDate(l.lend_date)}</td>
                <td className="whitespace-nowrap">{formatDate(l.due_date)}</td>
                <td className="whitespace-nowrap">{l.status === "active" ? <LoanStatusBadge due={l.due_date} /> : formatDate(l.return_date)}</td>
                <td>{l.condition_on_return ?? "—"}</td>
                <td className="max-w-64 text-sm text-ink-soft">{[l.notes, l.return_remarks].filter(Boolean).join(" · ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loans.length === 0 && <p className="p-8 text-center text-ink-soft">This book hasn’t been lent yet.</p>}
      </div>
    </section>
  );
}

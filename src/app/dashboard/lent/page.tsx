import type { Metadata } from "next";
import Link from "next/link";
import { LoanStatusBadge } from "@/components/Badges";
import { PageHeader } from "@/components/PageHeader";
import { getPublicLoans } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Lent books" };

export default function LentPage() {
  const loans = getPublicLoans();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader eyebrow="Currently out" title="Lent books" back={{ href: "/dashboard", label: "Dashboard" }}>
        <p className="text-sm text-ink-soft">Phone numbers and other contact details stay with the librarian.</p>
      </PageHeader>
      <div className="card overflow-x-auto">
        <table className="table min-w-[680px]">
          <thead>
            <tr>
              <th>Book</th>
              <th>Rack</th>
              <th>Lent by</th>
              <th>Lent on</th>
              <th>Due back</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((l) => (
              <tr key={l.id}>
                <td className="font-semibold">
                  {l.book_id ? (
                    <Link href={`/catalogue?book=${l.book_id}`} className="hover:underline">
                      {l.book_title}
                    </Link>
                  ) : (
                    l.book_title
                  )}
                </td>
                <td>{l.rack_number ? <span className="rack-plate">{l.rack_number}</span> : "—"}</td>
                <td>{l.borrower_name}</td>
                <td className="whitespace-nowrap">{formatDate(l.lend_date)}</td>
                <td className="whitespace-nowrap">{formatDate(l.due_date)}</td>
                <td>
                  <LoanStatusBadge due={l.due_date} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loans.length === 0 && <p className="p-8 text-center text-ink-soft">Every book is on the shelf right now.</p>}
      </div>
    </div>
  );
}

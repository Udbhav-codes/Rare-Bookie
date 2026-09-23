import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookCheck, BookUp } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { getActivity, getStats } from "@/lib/data";
import { plural, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  const s = getStats();
  const recent = getActivity(5);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader eyebrow="The library at a glance" title="Dashboard" />

      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/catalogue" className="index-card flex flex-col px-6 pb-12 pt-5">
          <CardHead label="Total books" />
          <p className="display mt-8 text-7xl">{s.copies.toLocaleString("en-IN")}</p>
          <p className="mt-3 text-ink-soft">copies across {plural(s.titles, "title")}</p>
          <p className="mt-auto pt-6 text-sm">
            <span className="font-semibold text-ok">{s.available} on the shelf</span> right now
          </p>
        </Link>

        <Link href="/dashboard/lent" className="index-card flex flex-col px-6 pb-12 pt-5">
          <CardHead label="Lent books" />
          <p className="display mt-8 text-7xl">{s.active}</p>
          <p className="mt-3 text-ink-soft">{s.active === 1 ? "copy is" : "copies are"} out with borrowers</p>
          <p className="mt-auto pt-6 text-sm">
            {s.overdue > 0 ? (
              <span className="font-semibold text-bad">{s.overdue} overdue</span>
            ) : (
              <span className="font-semibold text-ok">Nothing overdue</span>
            )}
          </p>
        </Link>

        <Link href="/dashboard/history" className="index-card flex flex-col px-6 pb-12 pt-5">
          <CardHead label="History" />
          <p className="mt-6 text-ink-soft">
            <span className="display text-4xl text-ink">{s.totalLoans}</span> loans recorded
          </p>
          <ul className="mt-4 space-y-0 text-sm">
            {recent.map((a, i) => (
              <li key={i} className="flex h-7 items-center gap-2">
                {a.kind === "returned" ? (
                  <BookCheck size={15} className="shrink-0 text-ok" aria-label="Returned" />
                ) : (
                  <BookUp size={15} className="shrink-0 text-warn" aria-label="Lent" />
                )}
                <span className="min-w-0 truncate">
                  <em className="not-italic font-semibold">{a.book_title}</em> {a.kind}
                </span>
                <span className="ml-auto shrink-0 font-mono text-xs text-ink-soft">{timeAgo(a.at)}</span>
              </li>
            ))}
            {recent.length === 0 && <li className="text-ink-soft">No loans yet.</li>}
          </ul>
        </Link>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <section className="card p-6">
          <h2 className="label-mono text-ink-soft">Available now</h2>
          <p className="display mt-3 text-5xl text-ok">{s.available}</p>
          <p className="mt-1 text-sm text-ink-soft">copies ready to borrow</p>
        </section>
        <section className="card p-6">
          <h2 className="label-mono text-ink-soft">Added this month</h2>
          <p className="display mt-3 text-5xl">{s.addedThisMonth}</p>
          <p className="mt-1 text-sm text-ink-soft">new {s.addedThisMonth === 1 ? "title" : "titles"} on the shelves</p>
        </section>
        <section className="card p-6">
          <h2 className="label-mono text-ink-soft">Most borrowed</h2>
          <ol className="mt-3 space-y-2">
            {s.mostBorrowed.map((b, i) => (
              <li key={b.id}>
                <Link href={`/catalogue?book=${b.id}`} className="group flex items-baseline gap-3">
                  <span className="font-mono text-sm text-gilt-ink">{i + 1}.</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold group-hover:underline">{b.title}</span>
                    <span className="block truncate text-sm text-ink-soft">{b.author}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-ink-soft">{plural(b.n, "loan")}</span>
                </Link>
              </li>
            ))}
            {s.mostBorrowed.length === 0 && <li className="text-sm text-ink-soft">No loans yet.</li>}
          </ol>
        </section>
      </div>
    </div>
  );
}

function CardHead({ label }: { label: string }) {
  return (
    <div className="flex h-8 items-center justify-between">
      <h2 className="label-mono font-bold">{label}</h2>
      <ArrowUpRight size={18} className="text-ink-soft" aria-hidden />
    </div>
  );
}

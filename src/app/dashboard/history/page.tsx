import type { Metadata } from "next";
import Link from "next/link";
import { BookCheck, BookUp } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { getActivity } from "@/lib/data";
import { formatDate, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  const events = getActivity();
  // Group by calendar day for easier scanning.
  const groups = new Map<string, typeof events>();
  for (const e of events) {
    const day = new Date(e.at).toLocaleDateString("en-CA");
    groups.set(day, [...(groups.get(day) ?? []), e]);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PageHeader eyebrow="Every lend and return" title="History" back={{ href: "/dashboard", label: "Dashboard" }} />
      {events.length === 0 && <p className="card p-8 text-center text-ink-soft">No loans have been recorded yet.</p>}
      <div className="space-y-8">
        {[...groups].map(([day, list]) => (
          <section key={day}>
            <h2 className="label-mono mb-2 border-b border-line pb-2 text-ink-soft">{formatDate(day)}</h2>
            <ul>
              {list.map((e, i) => (
                <li key={i} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${e.kind === "returned" ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"}`}
                  >
                    {e.kind === "returned" ? <BookCheck size={17} aria-hidden /> : <BookUp size={17} aria-hidden />}
                  </span>
                  <p className="min-w-0 flex-1">
                    {e.book_id ? (
                      <Link href={`/catalogue?book=${e.book_id}`} className="font-semibold hover:underline">
                        {e.book_title}
                      </Link>
                    ) : (
                      <span className="font-semibold">{e.book_title}</span>
                    )}{" "}
                    <span className="text-ink-soft">{e.kind === "returned" ? "was returned" : "was lent out"}</span>
                  </p>
                  <time dateTime={e.at} className="shrink-0 font-mono text-xs text-ink-soft">
                    {timeAgo(e.at)}
                  </time>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

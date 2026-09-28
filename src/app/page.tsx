import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BookCover } from "@/components/BookCover";
import { RackMap } from "@/components/RackMap";
import { getLibrarySettings, getNewArrivals, getRackSummary, getStats } from "@/lib/data";
import { plural } from "@/lib/utils";

export default async function Home() {
  const [{ rackRows, libraryName }, summary, stats, arrivals] = await Promise.all([
    getLibrarySettings(),
    getRackSummary(),
    getStats(),
    getNewArrivals(6),
  ]);

  return (
    <>
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:pb-24 lg:pt-16">
        <div className="reveal">
          <p className="label-mono text-gilt-ink">
            {libraryName} · {plural(stats.titles, "title")} on {plural(rackRows * 3, "shelf", "shelves")}
          </p>
          <h1 className="display mt-4 text-[clamp(3rem,7.2vw,6.25rem)]">
            Every book
            <br />
            has its <em className="text-bottle">place</em>.
          </h1>
          <p className="mt-6 max-w-md text-lg text-ink-soft">
            Browse the collection, check what’s on the shelf right now, and see exactly which compartment to walk to.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/catalogue" className="btn btn-primary">
              Browse catalogue <ArrowRight size={17} aria-hidden />
            </Link>
            <Link href="/dashboard" className="btn btn-outline">
              View dashboard
            </Link>
          </div>
          <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-5 text-sm">
            <div>
              <dt className="text-ink-soft">On the shelf</dt>
              <dd className="font-mono text-lg font-bold">{stats.available}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Out on loan</dt>
              <dd className="font-mono text-lg font-bold">{stats.active}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Added this month</dt>
              <dd className="font-mono text-lg font-bold">{stats.addedThisMonth}</dd>
            </div>
          </dl>
        </div>

        <figure className="reveal [animation-delay:120ms]">
          <RackMap rows={rackRows} summary={summary} hrefFor={(r) => `/catalogue?rack=${r}`} />
          <figcaption className="mt-4 flex items-center justify-between gap-4 text-sm text-ink-soft">
            <span>Tap a compartment to see its books.</span>
            <span className="label-mono hidden sm:inline">R1 → R{rackRows * 3}</span>
          </figcaption>
        </figure>
      </section>

      {arrivals.length > 0 && (
        <section className="border-t border-line bg-paper-2/60">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <div className="flex items-end justify-between gap-4">
              <h2 className="display text-3xl sm:text-4xl">New arrivals</h2>
              <Link href="/catalogue?sort=newest" className="text-sm font-semibold underline-offset-4 hover:underline">
                See all newest
              </Link>
            </div>
            <ul className="scrollbar-thin -mx-4 mt-6 flex snap-x gap-5 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
              {arrivals.map((b) => (
                <li key={b.id} className="w-36 shrink-0 snap-start sm:w-auto">
                  <Link href={`/catalogue?book=${b.id}`} className="group block">
                    <BookCover book={b} className="transition-transform duration-200 group-hover:-translate-y-1" />
                    <p className="mt-3 line-clamp-2 font-semibold leading-snug">{b.title}</p>
                    <p className="truncate text-sm text-ink-soft">{b.author}</p>
                    <span className="rack-plate mt-2">{b.rack_number}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-ink-soft sm:px-6">
          <span className="display text-base text-ink">{libraryName}</span>
          <span>Ask at the desk to borrow a book.</span>
        </div>
      </footer>
    </>
  );
}

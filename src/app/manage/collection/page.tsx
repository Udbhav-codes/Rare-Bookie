import type { Metadata } from "next";
import { Suspense } from "react";
import { getBook, getBooks, getCategories, getLibrarySettings, getRackSummary } from "@/lib/data";
import { CategoryManager } from "./CategoryManager";
import { CollectionView } from "./CollectionView";
import { LoanDaysForm, RackManager } from "./RackManager";

export const metadata: Metadata = { title: "Collection" };

export default async function CollectionPage({ searchParams }: PageProps<"/manage/collection">) {
  const { saved } = await searchParams;
  const [savedBook, { rackRows, loanDays }, books, categories, rackSummary] = await Promise.all([
    saved ? getBook(Number(saved)) : undefined,
    getLibrarySettings(),
    getBooks(),
    getCategories(),
    getRackSummary(),
  ]);

  return (
    <div className="space-y-14">
      {savedBook && (
        <p className="rounded-xl bg-ok-bg px-4 py-3 text-sm font-medium text-ok no-print" role="status">
          Saved “{savedBook.title}” in {savedBook.rack_number}.
        </p>
      )}
      <Suspense>
        <CollectionView books={books} categories={categories} rackRows={rackRows} />
      </Suspense>

      <div className="no-print grid gap-8 lg:grid-cols-2">
        <RackManager rows={rackRows} summary={rackSummary} />
        <div className="space-y-8">
          <CategoryManager categories={categories} />
          <LoanDaysForm days={loanDays} />
        </div>
      </div>
    </div>
  );
}

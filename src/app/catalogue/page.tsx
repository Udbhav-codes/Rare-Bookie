import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { getBooks, getCategories, getLibrarySettings } from "@/lib/data";
import { CatalogueView } from "./CatalogueView";

export const metadata: Metadata = { title: "Catalogue" };

export default async function CataloguePage() {
  const [books, categories, { rackRows }] = await Promise.all([getBooks(), getCategories(), getLibrarySettings()]);
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6">
      <PageHeader eyebrow="Browse the shelves" title="Catalogue" />
      <Suspense>
        <CatalogueView books={books} categories={categories} rackRows={rackRows} />
      </Suspense>
    </div>
  );
}

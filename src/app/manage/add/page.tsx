import type { Metadata } from "next";
import { getCategories, getLibrarySettings } from "@/lib/data";
import { BookForm } from "../BookForm";

export const metadata: Metadata = { title: "Add a book" };

export default async function AddPage() {
  const [categories, { rackRows }] = await Promise.all([getCategories(), getLibrarySettings()]);
  return (
    <section aria-labelledby="add-h">
      <h2 id="add-h" className="display text-3xl">
        Add a book
      </h2>
      <p className="mb-6 mt-1 text-ink-soft">Enter an ISBN and use Fetch details to fill most fields in one go.</p>
      <BookForm categories={categories} rackRows={rackRows} />
    </section>
  );
}

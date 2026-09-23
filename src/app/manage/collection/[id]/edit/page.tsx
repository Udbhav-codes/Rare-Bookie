import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getBook, getCategories, getLibrarySettings } from "@/lib/data";
import { BookForm } from "../../../BookForm";

export const metadata: Metadata = { title: "Edit book" };

export default async function EditBookPage({ params }: PageProps<"/manage/collection/[id]/edit">) {
  const { id } = await params;
  const book = getBook(Number(id));
  if (!book) notFound();
  const { rackRows } = getLibrarySettings();
  return (
    <section>
      <PageHeader title={`Edit “${book.title}”`} back={{ href: "/manage/collection", label: "Collection" }} />
      <BookForm categories={getCategories()} rackRows={rackRows} book={book} />
    </section>
  );
}

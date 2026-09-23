"use server";

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin, NotAdminError } from "@/lib/auth";
import { get, getSetting, run, transaction, UPLOAD_DIR } from "@/lib/db";
import type { ActionState } from "@/lib/types";
import { rackLabels, todayISO } from "@/lib/utils";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const MAX_COVER_BYTES = 3 * 1024 * 1024;
const COVER_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

async function saveCover(file: File): Promise<string> {
  const ext = COVER_TYPES[file.type];
  const name = `${randomUUID()}.${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `/api/covers/${name}`;
}

function resolveCategory(fd: FormData): number | null {
  const choice = str(fd, "category_id");
  if (choice === "__new") {
    const name = str(fd, "new_category");
    const found = get<{ id: number }>("SELECT id FROM categories WHERE name = ?", name);
    return found ? found.id : Number(run("INSERT INTO categories(name) VALUES (?)", name).lastInsertRowid);
  }
  return choice ? Number(choice) : null;
}

export async function saveBook(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let savedId: number | null = null;
  const intent = str(fd, "intent");
  try {
    await assertAdmin();
    const id = Number(fd.get("id")) || null;
    const title = str(fd, "title");
    const author = str(fd, "author");
    const isbn = str(fd, "isbn").replace(/[\s-]/g, "");
    const yearRaw = str(fd, "year");
    const copies = Number(str(fd, "copies") || "1");
    const rack = str(fd, "rack_number").toUpperCase();
    const coverUrlInput = str(fd, "cover_url");
    const cover = fd.get("cover_file");
    const coverFile = cover instanceof File && cover.size > 0 ? cover : null;
    const dateAdded = str(fd, "date_added") || todayISO();
    const racks = rackLabels(Number(getSetting("rack_rows", "4")));

    const errors: Record<string, string> = {};
    if (!title) errors.title = "Enter the book title.";
    if (!author) errors.author = "Enter at least one author.";
    if (isbn && !/^(\d{9}[\dXx]|\d{13})$/.test(isbn)) errors.isbn = "ISBNs have 10 or 13 digits.";
    if (str(fd, "category_id") === "__new" && !str(fd, "new_category")) errors.new_category = "Name the new category.";
    if (yearRaw && !/^\d{3,4}$/.test(yearRaw)) errors.year = "Enter a year like 1998.";
    if (!Number.isInteger(copies) || copies < 1 || copies > 500) errors.copies = "Enter a number of copies from 1 to 500.";
    if (!racks.includes(rack)) errors.rack_number = "Choose which rack compartment the book goes in.";
    if (coverFile && !COVER_TYPES[coverFile.type]) errors.cover_file = "Upload a JPG, PNG or WebP image.";
    if (coverFile && coverFile.size > MAX_COVER_BYTES) errors.cover_file = "Cover images must be 3 MB or smaller.";
    if (coverUrlInput && !/^https?:\/\//i.test(coverUrlInput) && !coverUrlInput.startsWith("/api/covers/"))
      errors.cover_url = "Cover links must start with http:// or https://.";
    if (Object.keys(errors).length) return { errors };

    const coverUrl = coverFile ? await saveCover(coverFile) : coverUrlInput || null;
    const fields = {
      title,
      author,
      isbn: isbn || null,
      publisher: str(fd, "publisher") || null,
      year: yearRaw ? Number(yearRaw) : null,
      edition: str(fd, "edition") || null,
      language: str(fd, "language") || null,
      description: str(fd, "description") || null,
      rack,
    };

    const saved = transaction((): { id: number; message: string } => {
      const categoryId = resolveCategory(fd);
      if (id) {
        const current = get<{ total_copies: number; available_copies: number }>(
          "SELECT total_copies, available_copies FROM books WHERE id = ?",
          id,
        );
        if (!current) throw new Error("!This book was deleted by someone else.");
        const out = current.total_copies - current.available_copies;
        if (copies < out) throw new Error(`!${out} ${out === 1 ? "copy is" : "copies are"} lent out right now, so total copies can't go below ${out}.`);
        run(
          `UPDATE books SET title=?, author=?, isbn=?, category_id=?, publisher=?, year=?, edition=?, language=?, description=?,
             cover_url=?, rack_number=?, total_copies=?, available_copies=? WHERE id=?`,
          fields.title,
          fields.author,
          fields.isbn,
          categoryId,
          fields.publisher,
          fields.year,
          fields.edition,
          fields.language,
          fields.description,
          coverUrl,
          fields.rack,
          copies,
          copies - out,
          id,
        );
        return { id, message: `Saved changes to “${title}”.` };
      }

      // Same ISBN already on the shelves? Add copies instead of creating a duplicate record.
      const dup = fields.isbn
        ? get<{ id: number; title: string; rack_number: string }>("SELECT id, title, rack_number FROM books WHERE isbn = ?", fields.isbn)
        : undefined;
      if (dup) {
        run("UPDATE books SET total_copies = total_copies + ?, available_copies = available_copies + ? WHERE id = ?", copies, copies, dup.id);
        return {
          id: dup.id,
          message: `“${dup.title}” is already in the library, so ${copies} more ${copies === 1 ? "copy was" : "copies were"} added to it in ${dup.rack_number}.`,
        };
      }

      const createdAt = dateAdded === todayISO() ? new Date().toISOString() : `${dateAdded}T09:00:00.000Z`;
      const newId = Number(
        run(
          `INSERT INTO books(title, author, isbn, category_id, publisher, year, edition, language, description, cover_url, rack_number, total_copies, available_copies, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          fields.title,
          fields.author,
          fields.isbn,
          categoryId,
          fields.publisher,
          fields.year,
          fields.edition,
          fields.language,
          fields.description,
          coverUrl,
          fields.rack,
          copies,
          copies,
          createdAt,
        ).lastInsertRowid,
      );
      return { id: newId, message: `Added “${title}” to ${rack}.` };
    });

    revalidatePath("/", "layout");
    savedId = saved.id;
    return { ok: true, stamp: Date.now(), message: saved.message };
  } catch (e) {
    if (e instanceof NotAdminError) return { message: e.message };
    if (e instanceof Error && e.message.startsWith("!")) return { message: e.message.slice(1) };
    console.error(e);
    return { message: "The book couldn't be saved. Nothing was changed — try again." };
  } finally {
    // redirect() throws, so it must run outside the try/catch.
    if (savedId && intent === "save") redirect(`/manage/collection?saved=${savedId}`);
  }
}

export async function deleteBook(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const id = Number(fd.get("id"));
    const book = get<{ title: string; total_copies: number; available_copies: number; cover_url: string | null }>(
      "SELECT title, total_copies, available_copies, cover_url FROM books WHERE id = ?",
      id,
    );
    if (!book) return { message: "That book was already deleted." };
    const active = get<{ n: number }>("SELECT COUNT(*) AS n FROM loans WHERE book_id = ? AND status = 'active'", id)!.n;
    if (active > 0)
      return { message: `“${book.title}” has ${active} ${active === 1 ? "copy" : "copies"} lent out. Mark ${active === 1 ? "it" : "them"} as returned before deleting.` };
    run("DELETE FROM books WHERE id = ?", id);
    if (book.cover_url?.startsWith("/api/covers/")) {
      await fs.rm(path.join(UPLOAD_DIR, path.basename(book.cover_url)), { force: true });
    }
    revalidatePath("/", "layout");
    return { ok: true, stamp: Date.now(), message: `Deleted “${book.title}”. Its past loans stay in the history.` };
  } catch (e) {
    if (e instanceof NotAdminError) return { message: e.message };
    console.error(e);
    return { message: "The book couldn't be deleted. Try again." };
  }
}

export type IsbnLookup = {
  ok: boolean;
  message?: string;
  title?: string;
  author?: string;
  publisher?: string;
  year?: string;
  cover_url?: string;
  description?: string;
};

/** Pull title/author/publisher from Open Library. Needs an internet connection; the form works without it. */
export async function lookupIsbn(isbnRaw: string): Promise<IsbnLookup> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, message: "Sign in again to look up ISBNs." };
  }
  const isbn = isbnRaw.replace(/[\s-]/g, "");
  if (!/^(\d{9}[\dXx]|\d{13})$/.test(isbn)) return { ok: false, message: "Enter a 10- or 13-digit ISBN first." };
  try {
    const signal = AbortSignal.timeout(7000);
    const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`, { signal, headers: { Accept: "application/json" } });
    if (res.status === 404) return { ok: false, message: "No book found for that ISBN. Fill the details in by hand." };
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as {
      title?: string;
      subtitle?: string;
      publishers?: string[];
      publish_date?: string;
      authors?: { key: string }[];
      works?: { key: string }[];
      description?: string | { value: string };
    };
    const authors = await Promise.all(
      (data.authors ?? []).slice(0, 3).map(async (a) => {
        const r = await fetch(`https://openlibrary.org${a.key}.json`, { signal });
        return r.ok ? ((await r.json()) as { name?: string }).name : undefined;
      }),
    );
    let description = typeof data.description === "string" ? data.description : data.description?.value;
    if (!description && data.works?.[0]) {
      const w = await fetch(`https://openlibrary.org${data.works[0].key}.json`, { signal });
      if (w.ok) {
        const wd = (await w.json()) as { description?: string | { value: string } };
        description = typeof wd.description === "string" ? wd.description : wd.description?.value;
      }
    }
    return {
      ok: true,
      title: [data.title, data.subtitle].filter(Boolean).join(": "),
      author: authors.filter(Boolean).join(", "),
      publisher: data.publishers?.[0],
      year: data.publish_date?.match(/\d{4}/)?.[0],
      cover_url: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
      description: description?.split("\n")[0]?.slice(0, 600),
      message: "Details filled in from Open Library. Check them before saving.",
    };
  } catch {
    return { ok: false, message: "Couldn't reach Open Library. Check the internet connection or fill the details in by hand." };
  }
}

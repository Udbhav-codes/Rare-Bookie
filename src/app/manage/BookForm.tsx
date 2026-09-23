"use client";

import Link from "next/link";
import { useActionState, useRef, useState, useTransition } from "react";
import { ImagePlus, Link2, Sparkles } from "lucide-react";
import { lookupIsbn, saveBook } from "@/app/actions/books";
import { BookCover } from "@/components/BookCover";
import { errProps, Field, FormErrorsSummary, Notice, submitWith } from "@/components/form";
import type { ActionState, Book, Category } from "@/lib/types";
import { describeRack, RACK_COL_WIDTHS, rackLabels, todayISO } from "@/lib/utils";

type Props = { categories: Category[]; rackRows: number; book?: Book };

export function BookForm(props: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveBook, {});
  const editing = !!props.book;
  return (
    <div className="space-y-4">
      <Notice state={state} />
      <FormErrorsSummary state={state} />
      {/* New-book form clears after "Save & add another"; the edit form keeps its values. */}
      <BookFields key={editing ? "edit" : (state.stamp ?? 0)} {...props} state={state} action={action} pending={pending} />
    </div>
  );
}

function BookFields({
  categories,
  rackRows,
  book,
  state,
  action,
  pending,
}: Props & { state: ActionState; action: (fd: FormData) => void; pending: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState(book?.title ?? "");
  const [author, setAuthor] = useState(book?.author ?? "");
  const [isbn, setIsbn] = useState(book?.isbn ?? "");
  const [publisher, setPublisher] = useState(book?.publisher ?? "");
  const [year, setYear] = useState(book?.year ? String(book.year) : "");
  const [description, setDescription] = useState(book?.description ?? "");
  const [categoryId, setCategoryId] = useState(book?.category_id ? String(book.category_id) : "");
  const [rack, setRack] = useState(book?.rack_number ?? "");
  const [coverMode, setCoverMode] = useState<"upload" | "url">(book?.cover_url && !book.cover_url.startsWith("/api/covers/") ? "url" : "upload");
  const [coverUrl, setCoverUrl] = useState(book?.cover_url ?? "");
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [lookupMsg, setLookupMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [looking, startLookup] = useTransition();

  const doLookup = () =>
    startLookup(async () => {
      const r = await lookupIsbn(isbn);
      setLookupMsg(r.message ? { ok: r.ok, text: r.message } : null);
      if (!r.ok) return;
      if (r.title) setTitle(r.title);
      if (r.author) setAuthor(r.author);
      if (r.publisher) setPublisher(r.publisher);
      if (r.year) setYear(r.year);
      if (r.description && !description) setDescription(r.description);
      if (r.cover_url && !filePreview) {
        setCoverMode("url");
        setCoverUrl(r.cover_url);
      }
    });

  const previewBook = {
    id: book?.id ?? title.length + author.length,
    title: title || "Book title",
    author: author || "Author",
    isbn: coverMode === "url" && !coverUrl ? isbn : null,
    cover_url: filePreview ?? (coverMode === "url" ? coverUrl || null : (book?.cover_url ?? null)),
  };

  return (
    <form ref={formRef} onSubmit={submitWith(action)} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]" noValidate encType="multipart/form-data">
      {book && <input type="hidden" name="id" value={book.id} />}

      <div className="card space-y-6 p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="isbn" label="ISBN" optional error={state.errors?.isbn} className="sm:col-span-2">
            <div className="flex gap-2">
              <input
                id="isbn"
                name="isbn"
                className="field font-mono"
                inputMode="numeric"
                placeholder="e.g. 9780143039655"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                {...errProps(state, "isbn")}
              />
              <button type="button" className="btn btn-outline shrink-0" onClick={doLookup} disabled={looking || !isbn.trim()}>
                <Sparkles size={16} aria-hidden /> {looking ? "Looking up…" : "Fetch details"}
              </button>
            </div>
            {lookupMsg && <p className={`mt-1.5 text-sm ${lookupMsg.ok ? "text-ok" : "text-warn"}`}>{lookupMsg.text}</p>}
          </Field>

          <Field id="title" label="Book title" error={state.errors?.title} className="sm:col-span-2">
            <input id="title" name="title" className="field" value={title} onChange={(e) => setTitle(e.target.value)} {...errProps(state, "title")} />
          </Field>
          <Field id="author" label="Author(s)" error={state.errors?.author} help="Separate several authors with commas." className="sm:col-span-2">
            <input id="author" name="author" className="field" value={author} onChange={(e) => setAuthor(e.target.value)} {...errProps(state, "author")} />
          </Field>

          <Field id="category_id" label="Category" optional error={state.errors?.new_category}>
            <select id="category_id" name="category_id" className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Uncategorised</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="__new">+ Add new category…</option>
            </select>
            {categoryId === "__new" && (
              <input
                name="new_category"
                className="field mt-2"
                placeholder="New category name"
                aria-label="New category name"
                autoFocus
                {...errProps(state, "new_category")}
              />
            )}
          </Field>
          <Field id="publisher" label="Publisher" optional>
            <input id="publisher" name="publisher" className="field" value={publisher} onChange={(e) => setPublisher(e.target.value)} />
          </Field>
          <Field id="year" label="Publication year" optional error={state.errors?.year}>
            <input id="year" name="year" className="field" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} {...errProps(state, "year")} />
          </Field>
          <Field id="edition" label="Edition" optional>
            <input id="edition" name="edition" className="field" defaultValue={book?.edition ?? ""} placeholder="e.g. 2nd" />
          </Field>
          <Field id="language" label="Language" optional>
            <input id="language" name="language" className="field" defaultValue={book?.language ?? "English"} />
          </Field>
          <Field
            id="copies"
            label={book ? "Total copies" : "Number of copies"}
            error={state.errors?.copies}
            help={book ? `${book.total_copies - book.available_copies} currently lent out.` : "If this ISBN is already in the library, the copies are added to it."}
          >
            <input id="copies" name="copies" type="number" min={1} max={500} className="field" defaultValue={book?.total_copies ?? 1} {...errProps(state, "copies")} />
          </Field>
        </div>

        <RackPicker rows={rackRows} value={rack} onChange={setRack} error={state.errors?.rack_number} />

        <Field id="description" label="Description / summary" optional>
          <textarea id="description" name="description" className="field" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        {!book && (
          <Field id="date_added" label="Date added" className="max-w-xs">
            <input id="date_added" name="date_added" type="date" className="field" defaultValue={todayISO()} max={todayISO()} />
          </Field>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
        <div className="card p-5">
          <p className="field-label">Cover image</p>
          <div className="mx-auto w-40">
            <BookCover key={previewBook.cover_url ?? "none"} book={previewBook} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-paper-2 p-1" role="group" aria-label="Cover source">
            <button
              type="button"
              aria-pressed={coverMode === "upload"}
              onClick={() => setCoverMode("upload")}
              className="flex min-h-9 items-center justify-center gap-1.5 rounded-full text-sm font-semibold aria-pressed:bg-card aria-pressed:shadow-card"
            >
              <ImagePlus size={15} aria-hidden /> Upload
            </button>
            <button
              type="button"
              aria-pressed={coverMode === "url"}
              onClick={() => setCoverMode("url")}
              className="flex min-h-9 items-center justify-center gap-1.5 rounded-full text-sm font-semibold aria-pressed:bg-card aria-pressed:shadow-card"
            >
              <Link2 size={15} aria-hidden /> Link
            </button>
          </div>
          <div className={coverMode === "upload" ? "mt-3" : "hidden"}>
            <label htmlFor="cover_file" className="sr-only">
              Upload cover
            </label>
            <input
              id="cover_file"
              name="cover_file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-bottle file:px-3 file:py-1.5 file:font-semibold file:text-on-bottle"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setFilePreview(f ? URL.createObjectURL(f) : null);
              }}
              {...errProps(state, "cover_file")}
            />
            <p className="field-help">JPG, PNG or WebP, up to 3 MB.</p>
            {state.errors?.cover_file && (
              <p id="cover_file-err" className="field-error">
                {state.errors.cover_file}
              </p>
            )}
            {coverMode === "upload" && book?.cover_url && !filePreview && <input type="hidden" name="cover_url" value={book.cover_url} />}
          </div>
          <div className={coverMode === "url" ? "mt-3" : "hidden"}>
            <label htmlFor="cover_url" className="sr-only">
              Cover image link
            </label>
            <input
              id="cover_url"
              name={coverMode === "url" ? "cover_url" : undefined}
              className="field text-sm"
              placeholder="https://…"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              {...errProps(state, "cover_url")}
            />
            {state.errors?.cover_url && (
              <p id="cover_url-err" className="field-error">
                {state.errors.cover_url}
              </p>
            )}
            <p className="field-help">Leave empty to use the Open Library cover for the ISBN.</p>
          </div>
        </div>

        <div className="card flex flex-col gap-2 p-4">
          <button type="submit" name="intent" value="save" className="btn btn-primary" disabled={pending}>
            {pending ? "Saving…" : book ? "Save changes" : "Save book"}
          </button>
          {book ? (
            <Link href="/manage/collection" className="btn btn-ghost">
              Cancel
            </Link>
          ) : (
            <>
              <button type="submit" name="intent" value="another" className="btn btn-outline" disabled={pending}>
                Save & add another
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  formRef.current?.reset();
                  setTitle("");
                  setAuthor("");
                  setIsbn("");
                  setPublisher("");
                  setYear("");
                  setDescription("");
                  setCategoryId("");
                  setRack("");
                  setCoverUrl("");
                  setFilePreview(null);
                  setLookupMsg(null);
                }}
              >
                Clear
              </button>
            </>
          )}
        </div>
      </aside>
    </form>
  );
}

function RackPicker({ rows, value, onChange, error }: { rows: number; value: string; onChange: (r: string) => void; error?: string }) {
  return (
    <fieldset aria-describedby={error ? "rack_number-err" : undefined}>
      <legend className="field-label">Rack number</legend>
      <input type="hidden" name="rack_number" value={value} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="rack rack-sm w-full max-w-80" style={{ gridTemplateColumns: RACK_COL_WIDTHS.map((w) => `${w}fr`).join(" ") }}>
          {rackLabels(rows).map((r) => (
            <button
              key={r}
              type="button"
              className="cubby min-h-10! cursor-pointer hover:brightness-150"
              data-active={r === value}
              aria-pressed={r === value}
              aria-label={`${r}, ${describeRack(r)}`}
              onClick={() => onChange(r)}
            >
              <span className="cubby-label">{r}</span>
            </button>
          ))}
        </div>
        <p className="text-sm text-ink-soft">
          {value ? (
            <>
              <span className="rack-plate">{value}</span> {describeRack(value)}
            </>
          ) : (
            "Tap the compartment this book will sit in."
          )}
        </p>
      </div>
      {error && (
        <p id="rack_number-err" className="field-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}

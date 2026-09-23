"use client";

import { useActionState, useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { addCategory, deleteCategory, renameCategory } from "@/app/actions/library";
import { Notice, submitWith } from "@/components/form";
import type { ActionState, Category } from "@/lib/types";

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [addState, add, adding] = useActionState<ActionState, FormData>(addCategory, {});
  const [editState, rename] = useActionState<ActionState, FormData>(renameCategory, {});
  const [delState, del] = useActionState<ActionState, FormData>(deleteCategory, {});
  const [editing, setEditing] = useState<number | null>(null);

  // Show whichever action happened most recently.
  const latest = [addState, editState, delState].sort((a, b) => (b.stamp ?? 0) - (a.stamp ?? 0))[0];

  return (
    <section aria-labelledby="cat-h" className="card p-5 sm:p-6">
      <h2 id="cat-h" className="display text-2xl">
        Categories
      </h2>
      <p className="mt-1 text-sm text-ink-soft">Categories become the headings in the public catalogue.</p>
      <div className="mt-3">
        <Notice state={latest.errors?.name ? { message: latest.errors.name } : latest} />
      </div>

      <ul className="mt-3 divide-y divide-line">
        {categories.map((c) => (
          <li key={c.id} className="flex min-h-12 items-center gap-2 py-1.5">
            {editing === c.id ? (
              <form
                key={`edit-${editState.stamp}`}
                onSubmit={(e) => {
                  submitWith(rename)(e);
                  setEditing(null);
                }}
                className="flex flex-1 items-center gap-1"
              >
                <input type="hidden" name="id" value={c.id} />
                <input name="name" defaultValue={c.name} className="field min-h-10 flex-1 py-1.5" aria-label={`New name for ${c.name}`} autoFocus />
                <button type="submit" className="icon-btn h-10 w-10 text-ok" aria-label="Save name">
                  <Check size={17} aria-hidden />
                </button>
                <button type="button" className="icon-btn h-10 w-10" aria-label="Cancel rename" onClick={() => setEditing(null)}>
                  <X size={17} aria-hidden />
                </button>
              </form>
            ) : (
              <>
                <span className="flex-1 font-medium">{c.name}</span>
                <span className="font-mono text-xs text-ink-soft">
                  {c.book_count} book{c.book_count === 1 ? "" : "s"}
                </span>
                <button type="button" className="icon-btn h-9 w-9" aria-label={`Rename ${c.name}`} onClick={() => setEditing(c.id)}>
                  <Pencil size={15} aria-hidden />
                </button>
                <form onSubmit={submitWith(del)}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    className="icon-btn h-9 w-9 text-bad disabled:opacity-30"
                    aria-label={`Delete ${c.name}`}
                    disabled={c.book_count > 0}
                    title={c.book_count > 0 ? "Move its books to another category first" : "Delete category"}
                  >
                    <Trash2 size={15} aria-hidden />
                  </button>
                </form>
              </>
            )}
          </li>
        ))}
      </ul>

      <form key={addState.ok ? addState.stamp : "add"} onSubmit={submitWith(add)} className="mt-4 flex gap-2">
        <label htmlFor="new-cat" className="sr-only">
          New category
        </label>
        <input id="new-cat" name="name" className="field min-h-10 flex-1 py-1.5" placeholder="New category, e.g. Poetry" />
        <button type="submit" className="btn btn-outline btn-sm min-h-10" disabled={adding}>
          Add
        </button>
      </form>
    </section>
  );
}

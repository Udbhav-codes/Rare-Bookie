"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin, NotAdminError } from "@/lib/auth";
import { all, get, getSetting, run, setSetting } from "@/lib/db";
import type { ActionState } from "@/lib/types";
import { RACK_COLUMNS } from "@/lib/utils";

const MAX_ROWS = 12;

async function guarded(fn: () => ActionState | Promise<ActionState>): Promise<ActionState> {
  try {
    await assertAdmin();
    const out = await fn();
    if (out.ok) revalidatePath("/", "layout");
    return { ...out, stamp: Date.now() };
  } catch (e) {
    if (e instanceof NotAdminError) return { message: e.message };
    console.error(e);
    return { message: "That change couldn't be saved. Try again." };
  }
}

/* ------------------------------ racks ------------------------------ */

export async function addRackRow(): Promise<ActionState> {
  return guarded(() => {
    const rows = Number(getSetting("rack_rows", "4"));
    if (rows >= MAX_ROWS) return { message: `The rack can have up to ${MAX_ROWS} rows.` };
    setSetting("rack_rows", String(rows + 1));
    const first = rows * RACK_COLUMNS + 1;
    return { ok: true, message: `Added row ${rows + 1}: compartments R${first}–R${first + RACK_COLUMNS - 1}.` };
  });
}

export async function removeRackRow(): Promise<ActionState> {
  return guarded(() => {
    const rows = Number(getSetting("rack_rows", "4"));
    if (rows <= 1) return { message: "The rack needs at least one row." };
    const labels = Array.from({ length: RACK_COLUMNS }, (_, i) => `R${(rows - 1) * RACK_COLUMNS + i + 1}`);
    const used = all<{ rack_number: string; n: number }>(
      `SELECT rack_number, COUNT(*) AS n FROM books WHERE upper(rack_number) IN (${labels.map(() => "?").join(",")}) GROUP BY rack_number`,
      ...labels,
    );
    if (used.length)
      return {
        message: `Row ${rows} still has books in ${used.map((u) => u.rack_number).join(", ")}. Move them to another compartment first.`,
      };
    setSetting("rack_rows", String(rows - 1));
    return { ok: true, message: `Removed row ${rows} (${labels[0]}–${labels[labels.length - 1]}).` };
  });
}

/* ---------------------------- categories ---------------------------- */

export async function addCategory(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(() => {
    const name = String(fd.get("name") ?? "").trim();
    if (!name) return { errors: { name: "Enter a category name." } };
    if (name.length > 40) return { errors: { name: "Keep category names under 40 characters." } };
    if (get("SELECT 1 FROM categories WHERE name = ?", name)) return { errors: { name: `“${name}” already exists.` } };
    run("INSERT INTO categories(name) VALUES (?)", name);
    return { ok: true, message: `Added the “${name}” category.` };
  });
}

export async function renameCategory(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(() => {
    const id = Number(fd.get("id"));
    const name = String(fd.get("name") ?? "").trim();
    if (!name) return { message: "Category names can't be empty." };
    const clash = get<{ id: number }>("SELECT id FROM categories WHERE name = ?", name);
    if (clash && clash.id !== id) return { message: `Another category is already called “${name}”.` };
    run("UPDATE categories SET name = ? WHERE id = ?", name, id);
    return { ok: true, message: `Renamed to “${name}”.` };
  });
}

export async function deleteCategory(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(() => {
    const id = Number(fd.get("id"));
    const cat = get<{ name: string; n: number }>(
      "SELECT c.name, (SELECT COUNT(*) FROM books WHERE category_id = c.id) AS n FROM categories c WHERE c.id = ?",
      id,
    );
    if (!cat) return { message: "That category was already deleted." };
    if (cat.n > 0) return { message: `“${cat.name}” still has ${cat.n} book${cat.n === 1 ? "" : "s"}. Move them to another category first.` };
    run("DELETE FROM categories WHERE id = ?", id);
    return { ok: true, message: `Deleted the “${cat.name}” category.` };
  });
}

/* ----------------------------- settings ----------------------------- */

export async function saveLoanDays(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded(() => {
    const days = Number(fd.get("days"));
    if (!Number.isInteger(days) || days < 1 || days > 120) return { message: "Enter a loan period from 1 to 120 days." };
    setSetting("default_loan_days", String(days));
    return { ok: true, message: `New loans now default to ${days} days.` };
  });
}

"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin, NotAdminError } from "@/lib/auth";
import { get, run, transaction } from "@/lib/db";
import type { ActionState } from "@/lib/types";
import { daysBetween, formatDate, todayISO } from "@/lib/utils";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

function fail(e: unknown): ActionState {
  if (e instanceof NotAdminError) return { message: e.message };
  if (e instanceof Error && e.message.startsWith("!")) return { message: e.message.slice(1) };
  console.error(e);
  return { message: "Something went wrong saving this. Nothing was changed — try again." };
}

export async function issueBook(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const admin = await assertAdmin();
    const bookId = Number(fd.get("book_id"));
    const name = str(fd, "name");
    const memberId = str(fd, "member_id");
    const lend = str(fd, "lend_date");
    const due = str(fd, "due_date");
    const notes = str(fd, "notes");

    const errors: Record<string, string> = {};
    if (!bookId) errors.book_id = "Choose the book being lent.";
    if (!name) errors.name = "Enter the borrower's name.";
    if (!isDate(lend)) errors.lend_date = "Choose the lending date.";
    if (!isDate(due)) errors.due_date = "Choose the due date.";
    else if (isDate(lend) && daysBetween(lend, due) < 0) errors.due_date = "The due date can't be before the lending date.";
    if (Object.keys(errors).length) return { errors };

    const title = transaction(() => {
      const book = get<{ title: string; available_copies: number }>("SELECT title, available_copies FROM books WHERE id = ?", bookId);
      if (!book) throw new Error("!That book no longer exists. Pick another one.");
      if (book.available_copies < 1) throw new Error(`!Every copy of “${book.title}” is already lent out.`);

      // Borrowers are identified by name, plus the member number when one is given.
      const existing = memberId
        ? get<{ id: number }>("SELECT id FROM borrowers WHERE lower(member_id) = lower(?)", memberId)
        : get<{ id: number }>("SELECT id FROM borrowers WHERE lower(name) = lower(?) AND member_id IS NULL", name);
      let borrowerId: number;
      if (existing) {
        borrowerId = existing.id;
        run("UPDATE borrowers SET name = ?, member_id = COALESCE(NULLIF(?, ''), member_id) WHERE id = ?", name, memberId, borrowerId);
      } else {
        borrowerId = Number(
          run("INSERT INTO borrowers(name, member_id, phone) VALUES (?, ?, '')", name, memberId || null).lastInsertRowid,
        );
      }
      run(
        `INSERT INTO loans(book_id, book_title, borrower_id, lend_date, due_date, status, notes, issued_by, created_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
        bookId,
        book.title,
        borrowerId,
        lend,
        due,
        notes || null,
        admin.id,
        new Date().toISOString(),
      );
      run("UPDATE books SET available_copies = available_copies - 1 WHERE id = ?", bookId);
      return book.title;
    });

    revalidatePath("/", "layout");
    return { ok: true, stamp: Date.now(), message: `Issued “${title}” to ${name}. Due back ${formatDate(due)}.` };
  } catch (e) {
    return fail(e);
  }
}

export async function returnBook(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const loanId = Number(fd.get("loan_id"));
    const returnDate = str(fd, "return_date") || todayISO();
    const condition = str(fd, "condition");
    const remarks = str(fd, "remarks");

    const errors: Record<string, string> = {};
    if (!loanId) errors.loan_id = "Find and select the loan being returned.";
    if (!isDate(returnDate)) errors.return_date = "Choose the return date.";
    if (!["Good", "Damaged", "Lost"].includes(condition)) errors.condition = "Choose the book's condition.";
    if (Object.keys(errors).length) return { errors };

    const result = transaction(() => {
      const loan = get<{ book_id: number | null; book_title: string; lend_date: string; status: string; name: string }>(
        "SELECT l.book_id, l.book_title, l.lend_date, l.status, b.name FROM loans l JOIN borrowers b ON b.id = l.borrower_id WHERE l.id = ?",
        loanId,
      );
      if (!loan) throw new Error("!That loan record wasn't found.");
      if (loan.status !== "active") throw new Error(`!“${loan.book_title}” has already been marked as returned.`);
      if (daysBetween(loan.lend_date, returnDate) < 0) throw new Error("!The return date can't be before the lending date.");

      run(
        "UPDATE loans SET status = 'returned', return_date = ?, condition_on_return = ?, return_remarks = ?, returned_at = ? WHERE id = ?",
        returnDate,
        condition,
        remarks || null,
        new Date().toISOString(),
        loanId,
      );
      if (loan.book_id) {
        // A lost copy leaves the collection; good or damaged copies go back on the shelf.
        if (condition === "Lost") run("UPDATE books SET total_copies = MAX(total_copies - 1, 0) WHERE id = ?", loan.book_id);
        else run("UPDATE books SET available_copies = MIN(available_copies + 1, total_copies) WHERE id = ?", loan.book_id);
      }
      return loan;
    });

    revalidatePath("/", "layout");
    const suffix = condition === "Lost" ? " The lost copy was removed from the collection." : "";
    return { ok: true, stamp: Date.now(), message: `Marked “${result.book_title}” as returned by ${result.name}.${suffix}` };
  } catch (e) {
    return fail(e);
  }
}

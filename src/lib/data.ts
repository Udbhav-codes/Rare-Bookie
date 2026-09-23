import "server-only";
import { all, get, getSetting } from "./db";
import type {
  Activity,
  AdminLoan,
  Book,
  BookSummary,
  Category,
  LoanHistoryRow,
  PublicLoan,
  RackSummary,
} from "./types";
import { todayISO } from "./utils";

const BOOK_SELECT = `
  SELECT b.*, c.name AS category,
    (SELECT COUNT(*) FROM loans l WHERE l.book_id = b.id) AS borrow_count
  FROM books b LEFT JOIN categories c ON c.id = b.category_id`;

export function getLibrarySettings() {
  return {
    libraryName: getSetting("library_name", "Rare Bookie"),
    loanDays: Number(getSetting("default_loan_days", "14")),
    rackRows: Number(getSetting("rack_rows", "4")),
  };
}

export function getCategories(): Category[] {
  return all<Category>(
    `SELECT c.id, c.name, COUNT(b.id) AS book_count
     FROM categories c LEFT JOIN books b ON b.category_id = c.id
     GROUP BY c.id ORDER BY c.name`,
  );
}

export function getBooks(): Book[] {
  return all<Book>(`${BOOK_SELECT} ORDER BY b.title COLLATE NOCASE`);
}

export function getBook(id: number): Book | undefined {
  return get<Book>(`${BOOK_SELECT} WHERE b.id = ?`, id);
}

export function getNewArrivals(limit = 6): Book[] {
  return all<Book>(`${BOOK_SELECT} ORDER BY b.created_at DESC LIMIT ?`, limit);
}

export function searchBooks(q: string, limit = 8): BookSummary[] {
  const term = q.trim().toLowerCase();
  if (!term) return [];
  const like = `%${term}%`;
  // Only treat the query as an ISBN fragment when it is mostly digits (so "r5" doesn't match ISBNs containing 5).
  const digits = /^[\d\s-]{4,}x?$/.test(term) ? term.replace(/[^0-9x]/g, "") : "";
  return all<BookSummary>(
    `SELECT b.id, b.title, b.author, b.isbn, b.cover_url, b.rack_number, b.available_copies, b.total_copies
     FROM books b LEFT JOIN categories c ON c.id = b.category_id
     WHERE lower(b.title) LIKE ? OR lower(b.author) LIKE ? OR lower(c.name) LIKE ?
        OR lower(b.rack_number) = ? OR (? <> '' AND replace(lower(b.isbn), '-', '') LIKE ?)
     ORDER BY (lower(b.rack_number) = ?) DESC, (lower(b.title) LIKE ?) DESC, b.title COLLATE NOCASE
     LIMIT ?`,
    like,
    like,
    like,
    term,
    digits,
    `%${digits}%`,
    term,
    `${term}%`,
    limit,
  );
}

export function getRackSummary(): RackSummary {
  const rows = all<{ id: number; title: string; rack_number: string; total_copies: number }>(
    "SELECT id, title, rack_number, total_copies FROM books ORDER BY rack_number, title COLLATE NOCASE",
  );
  const out: RackSummary = {};
  for (const r of rows) {
    const key = r.rack_number.toUpperCase();
    out[key] ??= { count: 0, copies: 0, spines: [] };
    out[key].count += 1;
    out[key].copies += r.total_copies;
    out[key].spines.push({ id: r.id, title: r.title, copies: r.total_copies });
  }
  return out;
}

export function getStats() {
  const today = todayISO();
  const monthStart = `${today.slice(0, 7)}-01`;
  const books = get<{ copies: number; titles: number; available: number }>(
    "SELECT COALESCE(SUM(total_copies),0) AS copies, COUNT(*) AS titles, COALESCE(SUM(available_copies),0) AS available FROM books",
  )!;
  const loans = get<{ active: number; overdue: number; total: number; returned: number }>(
    `SELECT
       SUM(status = 'active') AS active,
       SUM(status = 'active' AND due_date < ?) AS overdue,
       COUNT(*) AS total,
       SUM(status = 'returned') AS returned
     FROM loans`,
    today,
  )!;
  const addedThisMonth = get<{ n: number }>("SELECT COUNT(*) AS n FROM books WHERE substr(created_at,1,10) >= ?", monthStart)!.n;
  const mostBorrowed = all<{ id: number; title: string; author: string; n: number }>(
    `SELECT b.id, b.title, b.author, COUNT(l.id) AS n FROM loans l JOIN books b ON b.id = l.book_id
     GROUP BY b.id ORDER BY n DESC, b.title LIMIT 3`,
  );
  return {
    copies: books.copies,
    titles: books.titles,
    available: books.available,
    active: loans.active ?? 0,
    overdue: loans.overdue ?? 0,
    totalLoans: loans.total ?? 0,
    returned: loans.returned ?? 0,
    addedThisMonth,
    mostBorrowed,
  };
}

export function getActivity(limit?: number): Activity[] {
  return all<Activity>(
    `SELECT * FROM (
       SELECT 'lent' AS kind, book_title, book_id, created_at AS at FROM loans
       UNION ALL
       SELECT 'returned' AS kind, book_title, book_id, returned_at AS at FROM loans WHERE returned_at IS NOT NULL
     ) ORDER BY at DESC ${limit ? "LIMIT ?" : ""}`,
    ...(limit ? [limit] : []),
  );
}

/** Public view of books currently out — borrower name only, never their contact details. */
export function getPublicLoans(): PublicLoan[] {
  return all<PublicLoan>(
    `SELECT l.id, l.book_id, l.book_title, b.rack_number, br.name AS borrower_name, l.lend_date, l.due_date
     FROM loans l JOIN borrowers br ON br.id = l.borrower_id LEFT JOIN books b ON b.id = l.book_id
     WHERE l.status = 'active' ORDER BY l.due_date`,
  );
}

/** Admin-only: active loans with borrower contact details. */
export function getActiveLoans(): AdminLoan[] {
  return all<AdminLoan>(
    `SELECT l.id, l.book_id, l.book_title, b.rack_number, b.cover_url, b.isbn, b.author, l.lend_date, l.due_date, l.notes,
            br.id AS borrower_id, br.name AS borrower_name, br.member_id, br.phone, br.email, br.address
     FROM loans l JOIN borrowers br ON br.id = l.borrower_id LEFT JOIN books b ON b.id = l.book_id
     WHERE l.status = 'active' ORDER BY l.due_date`,
  );
}

export function getLoansForBook(bookId: number): LoanHistoryRow[] {
  return all<LoanHistoryRow>(
    `SELECT l.id, br.name AS borrower_name, br.phone, l.lend_date, l.due_date, l.return_date, l.status,
            l.condition_on_return, l.notes, l.return_remarks
     FROM loans l JOIN borrowers br ON br.id = l.borrower_id
     WHERE l.book_id = ? ORDER BY l.lend_date DESC, l.id DESC`,
    bookId,
  );
}

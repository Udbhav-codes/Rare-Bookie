import "server-only";
import { all, get, getSetting, SCHEMA } from "./db";
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
    (SELECT COUNT(*) FROM ${SCHEMA}.loans l WHERE l.book_id = b.id) AS borrow_count
  FROM ${SCHEMA}.books b LEFT JOIN ${SCHEMA}.categories c ON c.id = b.category_id`;

export async function getLibrarySettings() {
  const [libraryName, loanDays, rackRows] = await Promise.all([
    getSetting("library_name", "Rare Books"),
    getSetting("default_loan_days", "14"),
    getSetting("rack_rows", "4"),
  ]);
  return { libraryName, loanDays: Number(loanDays), rackRows: Number(rackRows) };
}

export function getCategories(): Promise<Category[]> {
  return all<Category>(
    `SELECT c.id, c.name, COUNT(b.id)::int AS book_count
     FROM ${SCHEMA}.categories c LEFT JOIN ${SCHEMA}.books b ON b.category_id = c.id
     GROUP BY c.id, c.name ORDER BY c.name`,
  );
}

export function getBooks(): Promise<Book[]> {
  return all<Book>(`${BOOK_SELECT} ORDER BY lower(b.title)`);
}

export function getBook(id: number): Promise<Book | undefined> {
  return get<Book>(`${BOOK_SELECT} WHERE b.id = ?`, id);
}

export function getNewArrivals(limit = 6): Promise<Book[]> {
  return all<Book>(`${BOOK_SELECT} ORDER BY b.created_at DESC LIMIT ?`, limit);
}

export function searchBooks(q: string, limit = 8): Promise<BookSummary[]> {
  const term = q.trim().toLowerCase();
  if (!term) return Promise.resolve([]);
  const like = `%${term}%`;
  // Only treat the query as an ISBN fragment when it is mostly digits (so "r5" doesn't match ISBNs containing 5).
  const digits = /^[\d\s-]{4,}x?$/.test(term) ? term.replace(/[^0-9x]/g, "") : "";
  return all<BookSummary>(
    `SELECT b.id, b.title, b.author, b.isbn, b.cover_url, b.rack_number, b.available_copies, b.total_copies
     FROM ${SCHEMA}.books b LEFT JOIN ${SCHEMA}.categories c ON c.id = b.category_id
     WHERE lower(b.title) LIKE ? OR lower(b.author) LIKE ? OR lower(c.name) LIKE ?
        OR lower(b.rack_number) = ? OR (? <> '' AND replace(lower(b.isbn), '-', '') LIKE ?)
     ORDER BY (lower(b.rack_number) = ?) DESC, (lower(b.title) LIKE ?) DESC, lower(b.title)
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

export async function getRackSummary(): Promise<RackSummary> {
  const rows = await all<{ id: number; title: string; rack_number: string; total_copies: number }>(
    `SELECT id, title, rack_number, total_copies FROM ${SCHEMA}.books ORDER BY rack_number, lower(title)`,
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

export async function getStats() {
  const today = todayISO();
  const monthStart = `${today.slice(0, 7)}-01`;
  const [books, loans, added, mostBorrowed] = await Promise.all([
    get<{ copies: number; titles: number; available: number }>(
      `SELECT COALESCE(SUM(total_copies),0)::int AS copies, COUNT(*)::int AS titles, COALESCE(SUM(available_copies),0)::int AS available
       FROM ${SCHEMA}.books`,
    ),
    get<{ active: number; overdue: number; total: number; returned: number }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'active' AND due_date < ?)::int AS overdue,
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'returned')::int AS returned
       FROM ${SCHEMA}.loans`,
      today,
    ),
    get<{ n: number }>(`SELECT COUNT(*)::int AS n FROM ${SCHEMA}.books WHERE substr(created_at,1,10) >= ?`, monthStart),
    all<{ id: number; title: string; author: string; n: number }>(
      `SELECT b.id, b.title, b.author, COUNT(l.id)::int AS n
       FROM ${SCHEMA}.loans l JOIN ${SCHEMA}.books b ON b.id = l.book_id
       GROUP BY b.id, b.title, b.author ORDER BY n DESC, b.title LIMIT 3`,
    ),
  ]);
  return {
    copies: books?.copies ?? 0,
    titles: books?.titles ?? 0,
    available: books?.available ?? 0,
    active: loans?.active ?? 0,
    overdue: loans?.overdue ?? 0,
    totalLoans: loans?.total ?? 0,
    returned: loans?.returned ?? 0,
    addedThisMonth: added?.n ?? 0,
    mostBorrowed,
  };
}

export function getActivity(limit?: number): Promise<Activity[]> {
  return all<Activity>(
    `SELECT * FROM (
       SELECT 'lent' AS kind, book_title, book_id, created_at AS at FROM ${SCHEMA}.loans
       UNION ALL
       SELECT 'returned' AS kind, book_title, book_id, returned_at AS at FROM ${SCHEMA}.loans WHERE returned_at IS NOT NULL
     ) events ORDER BY at DESC ${limit ? "LIMIT ?" : ""}`,
    ...(limit ? [limit] : []),
  );
}

/** Public view of books currently out — borrower name only, never their contact details. */
export function getPublicLoans(): Promise<PublicLoan[]> {
  return all<PublicLoan>(
    `SELECT l.id, l.book_id, l.book_title, b.rack_number, br.name AS borrower_name, l.lend_date, l.due_date
     FROM ${SCHEMA}.loans l JOIN ${SCHEMA}.borrowers br ON br.id = l.borrower_id
     LEFT JOIN ${SCHEMA}.books b ON b.id = l.book_id
     WHERE l.status = 'active' ORDER BY l.due_date`,
  );
}

/** Admin-only: active loans with borrower contact details. */
export function getActiveLoans(): Promise<AdminLoan[]> {
  return all<AdminLoan>(
    `SELECT l.id, l.book_id, l.book_title, b.rack_number, b.cover_url, b.isbn, b.author, l.lend_date, l.due_date, l.notes,
            br.id AS borrower_id, br.name AS borrower_name, br.member_id, br.phone, br.email, br.address
     FROM ${SCHEMA}.loans l JOIN ${SCHEMA}.borrowers br ON br.id = l.borrower_id
     LEFT JOIN ${SCHEMA}.books b ON b.id = l.book_id
     WHERE l.status = 'active' ORDER BY l.due_date`,
  );
}

export function getLoansForBook(bookId: number): Promise<LoanHistoryRow[]> {
  return all<LoanHistoryRow>(
    `SELECT l.id, br.name AS borrower_name, br.phone, l.lend_date, l.due_date, l.return_date, l.status,
            l.condition_on_return, l.notes, l.return_remarks
     FROM ${SCHEMA}.loans l JOIN ${SCHEMA}.borrowers br ON br.id = l.borrower_id
     WHERE l.book_id = ? ORDER BY l.lend_date DESC, l.id DESC`,
    bookId,
  );
}

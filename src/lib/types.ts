export type Category = { id: number; name: string; book_count: number };

export type Book = {
  id: number;
  title: string;
  author: string;
  isbn: string | null;
  category_id: number | null;
  category: string | null;
  publisher: string | null;
  year: number | null;
  edition: string | null;
  language: string | null;
  description: string | null;
  cover_url: string | null;
  rack_number: string;
  total_copies: number;
  available_copies: number;
  created_at: string;
  borrow_count: number;
};

/** Book shape safe for public pages and search suggestions. */
export type BookSummary = Pick<
  Book,
  "id" | "title" | "author" | "isbn" | "cover_url" | "rack_number" | "available_copies" | "total_copies"
>;

export type RackCell = { count: number; copies: number; spines: { id: number; title: string; copies: number }[] };
export type RackSummary = Record<string, RackCell>;

export type PublicLoan = {
  id: number;
  book_id: number | null;
  book_title: string;
  rack_number: string | null;
  borrower_name: string;
  lend_date: string;
  due_date: string;
};

export type AdminLoan = PublicLoan & {
  borrower_id: number;
  borrower_name: string;
  member_id: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  cover_url: string | null;
  isbn: string | null;
  author: string | null;
};

export type LoanHistoryRow = {
  id: number;
  borrower_name: string;
  phone: string;
  lend_date: string;
  due_date: string;
  return_date: string | null;
  status: "active" | "returned";
  condition_on_return: string | null;
  notes: string | null;
  return_remarks: string | null;
};

export type Activity = {
  kind: "lent" | "returned";
  book_title: string;
  book_id: number | null;
  at: string;
};

export type Admin = { id: number; name: string; email: string };

export type ActionState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Changes on every successful submit so client forms know to reset. */
  stamp?: number;
};

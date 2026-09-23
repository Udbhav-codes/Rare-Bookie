/** Shared, framework-free helpers. Safe to import from client and server. */

export const RACK_COLUMNS = 3;
/** Relative column widths, taken from the hand-drawn rack sketch (wide middle column). */
export const RACK_COL_WIDTHS = [1, 1.75, 1.1];
const COLUMN_NAMES = ["left", "middle", "right"];

export function rackLabels(rows: number): string[] {
  return Array.from({ length: rows * RACK_COLUMNS }, (_, i) => `R${i + 1}`);
}

export function rackPosition(rack: string): { row: number; col: number } | null {
  const n = Number(rack.replace(/^R/i, ""));
  if (!Number.isInteger(n) || n < 1) return null;
  return { row: Math.floor((n - 1) / RACK_COLUMNS), col: (n - 1) % RACK_COLUMNS };
}

const ORDINALS = ["top", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];

export function describeRack(rack: string): string {
  const p = rackPosition(rack);
  if (!p) return rack;
  const row = p.row === 0 ? "Top row" : `${(ORDINALS[p.row] ?? `row ${p.row + 1}`).replace(/^./, (c) => c.toUpperCase())} row`;
  return `${row}, ${COLUMN_NAMES[p.col]}`;
}

/* ---------- dates (all stored as local YYYY-MM-DD) ---------- */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export type LoanStatus = "ontime" | "duesoon" | "overdue";

export function loanStatus(due: string, today = todayISO()): LoanStatus {
  const left = daysBetween(today, due);
  if (left < 0) return "overdue";
  if (left <= 2) return "duesoon";
  return "ontime";
}

export const LOAN_STATUS_LABEL: Record<LoanStatus, string> = {
  ontime: "On time",
  duesoon: "Due soon",
  overdue: "Overdue",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return formatDate(iso);
}

/* ---------- book cloth colours (spines + generated covers) ---------- */

export const CLOTH = [
  "#285A46", // bottle green
  "#2B3E6C", // navy
  "#6B2626", // oxblood
  "#9A7229", // ochre
  "#3C5566", // slate
  "#5E4266", // plum
  "#2A5C57", // teal
  "#86462A", // rust
  "#56623A", // olive
];

function hash(n: number) {
  let x = (n * 2654435761) >>> 0;
  x ^= x >>> 15;
  return x;
}

export function clothFor(id: number): string {
  return CLOTH[hash(id) % CLOTH.length];
}

/** Spine width/height variance so a shelf doesn't look like a barcode. */
export function spineShape(id: number): { width: number; height: number } {
  const h = hash(id + 7);
  return { width: 10 + (h % 7), height: 64 + ((h >>> 4) % 32) };
}

export function coverSrc(book: { cover_url: string | null; isbn: string | null }): string | null {
  if (book.cover_url) return book.cover_url;
  if (book.isbn) return `https://covers.openlibrary.org/b/isbn/${book.isbn.replace(/[^0-9Xx]/g, "")}-M.jpg?default=false`;
  return null;
}

export function plural(n: number, word: string, pluralWord = `${word}s`) {
  return `${n.toLocaleString("en-IN")} ${n === 1 ? word : pluralWord}`;
}

/** True when a search term looks like (part of) an ISBN — 4+ digits, optional dashes/spaces. */
export function isbnMatch(isbn: string | null, term: string): boolean {
  if (!isbn || !/^[\d\s-]{4,}x?$/i.test(term)) return false;
  return isbn.replace(/[^0-9x]/gi, "").includes(term.replace(/[^0-9x]/gi, ""));
}

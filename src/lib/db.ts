import "server-only";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { seedIfEmpty } from "./seed";

export const DATA_DIR = path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

declare global {
  var __rareBookieDb: DatabaseSync | undefined;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE
);
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  publisher TEXT,
  year INTEGER,
  edition TEXT,
  language TEXT,
  description TEXT,
  cover_url TEXT,
  rack_number TEXT NOT NULL,
  total_copies INTEGER NOT NULL DEFAULT 1 CHECK (total_copies >= 0),
  available_copies INTEGER NOT NULL DEFAULT 1 CHECK (available_copies >= 0),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS books_isbn ON books(isbn);
CREATE TABLE IF NOT EXISTS borrowers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  member_id TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT
);
CREATE INDEX IF NOT EXISTS borrowers_phone ON borrowers(phone);
CREATE TABLE IF NOT EXISTS loans (
  id INTEGER PRIMARY KEY,
  book_id INTEGER REFERENCES books(id) ON DELETE SET NULL,
  book_title TEXT NOT NULL,
  borrower_id INTEGER NOT NULL REFERENCES borrowers(id),
  lend_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  return_date TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','returned')),
  condition_on_return TEXT,
  notes TEXT,
  return_remarks TEXT,
  issued_by INTEGER,
  created_at TEXT NOT NULL,
  returned_at TEXT
);
CREATE INDEX IF NOT EXISTS loans_status ON loans(status);
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export function db(): DatabaseSync {
  if (!globalThis.__rareBookieDb) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const d = new DatabaseSync(path.join(DATA_DIR, "rarebookie.db"));
    d.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;");
    d.exec(SCHEMA);
    seedIfEmpty(d);
    globalThis.__rareBookieDb = d;
  }
  return globalThis.__rareBookieDb;
}

type Params = SQLInputValue[];

/** node:sqlite returns null-prototype rows; spread them so they can cross to client components. */
export function all<T>(sql: string, ...params: Params): T[] {
  return db()
    .prepare(sql)
    .all(...params)
    .map((r) => ({ ...r }) as T);
}

export function get<T>(sql: string, ...params: Params): T | undefined {
  const row = db().prepare(sql).get(...params);
  return row ? ({ ...row } as T) : undefined;
}

export function run(sql: string, ...params: Params) {
  return db().prepare(sql).run(...params);
}

export function transaction<T>(fn: () => T): T {
  const d = db();
  d.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    d.exec("COMMIT");
    return out;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}

export function getSetting(key: string, fallback: string): string {
  return get<{ value: string }>("SELECT value FROM settings WHERE key = ?", key)?.value ?? fallback;
}

export function setSetting(key: string, value: string) {
  run("INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", key, value);
}

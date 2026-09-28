import "server-only";
import { Pool, type PoolClient } from "pg";
import { hashPassword } from "./password";

/**
 * Supabase Postgres (Mumbai). Every table lives in the `rarebookie` schema, so this app
 * shares a database with other projects without touching their tables.
 */
export const SCHEMA = "rarebookie";

declare global {
  var __rareBookiePool: Pool | undefined;
  var __rareBookieReady: Promise<void> | undefined;
}

function pool(): Pool {
  if (!globalThis.__rareBookiePool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set. Add it to .env.local (local) or the Vercel project settings.");
    globalThis.__rareBookiePool = new Pool({
      connectionString,
      // Serverless functions are short-lived; keep the pool small and let idle links close.
      max: Number(process.env.PG_POOL_MAX ?? 3),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 15_000,
      ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? undefined : { rejectUnauthorized: false },
    });
    globalThis.__rareBookiePool.on("error", (e) => console.error("Postgres pool error:", e.message));
  }
  return globalThis.__rareBookiePool;
}

/** The queries are written with `?` placeholders; Postgres wants $1, $2, … */
function toPg(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

type Runner = { query: (text: string, values: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }> };

export type Querier = {
  all<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  get<T>(sql: string, ...params: unknown[]): Promise<T | undefined>;
  run(sql: string, ...params: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number }>;
};

function querier(runner: Runner): Querier {
  return {
    async all<T>(sql: string, ...params: unknown[]) {
      const r = await runner.query(toPg(sql), params);
      return r.rows as T[];
    },
    async get<T>(sql: string, ...params: unknown[]) {
      const r = await runner.query(toPg(sql), params);
      return (r.rows[0] as T | undefined) ?? undefined;
    },
    async run(sql: string, ...params: unknown[]) {
      const r = await runner.query(toPg(sql), params);
      return { rows: r.rows, rowCount: r.rowCount ?? 0 };
    },
  };
}

export async function all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
  await ready();
  return querier(pool()).all<T>(sql, ...params);
}

export async function get<T>(sql: string, ...params: unknown[]): Promise<T | undefined> {
  await ready();
  return querier(pool()).get<T>(sql, ...params);
}

export async function run(sql: string, ...params: unknown[]) {
  await ready();
  return querier(pool()).run(sql, ...params);
}

/** Runs `fn` inside a transaction on a single connection. */
export async function transaction<T>(fn: (q: Querier) => Promise<T>): Promise<T> {
  await ready();
  const client: PoolClient = await pool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(querier(client));
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export async function getSetting(key: string, fallback: string): Promise<string> {
  const row = await get<{ value: string }>(`SELECT value FROM ${SCHEMA}.settings WHERE key = ?`, key);
  return row?.value ?? fallback;
}

export async function setSetting(key: string, value: string) {
  await run(
    `INSERT INTO ${SCHEMA}.settings(key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

/**
 * Bootstraps the first admin account from the environment variables. Passwords set inside the
 * app are never overwritten — set ADMIN_PASSWORD_RESET=1 to force this account's password back
 * to ADMIN_PASSWORD on the next start (the way back in if everyone is locked out).
 */
async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || "admin@rarebookie.local").trim();
  const name = process.env.ADMIN_NAME || "Librarian";
  const password = process.env.ADMIN_PASSWORD || "rarebookie";
  const q = querier(pool());
  const existing = await q.get<{ id: number }>(`SELECT id FROM ${SCHEMA}.admins WHERE lower(email) = lower(?)`, email);
  if (!existing) {
    await q.run(
      `INSERT INTO ${SCHEMA}.admins(name, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
      name,
      email,
      hashPassword(password),
      new Date().toISOString(),
    );
  } else if (process.env.ADMIN_PASSWORD_RESET === "1") {
    await q.run(`UPDATE ${SCHEMA}.admins SET name = ?, password_hash = ? WHERE id = ?`, name, hashPassword(password), existing.id);
  }
}

/** Runs once per server instance. */
function ready(): Promise<void> {
  globalThis.__rareBookieReady ??= ensureAdmin().catch((e) => {
    globalThis.__rareBookieReady = undefined;
    throw e;
  });
  return globalThis.__rareBookieReady;
}

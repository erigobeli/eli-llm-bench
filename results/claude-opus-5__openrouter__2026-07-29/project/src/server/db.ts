import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export type Db = Database.Database;

export const DEFAULT_DB_PATH = path.join(".data", "eli-llm-bench.sqlite");

export function resolveDbPath(raw?: string): string {
  const value = raw && raw.trim() !== "" ? raw.trim() : DEFAULT_DB_PATH;
  return path.resolve(process.cwd(), value);
}

/** Lowercase helper with full Unicode support (SQLite's lower() is ASCII only). */
function registerHelpers(db: Db): void {
  db.function("lc", { deterministic: true }, (value: unknown) =>
    value === null || value === undefined ? null : String(value).toLowerCase(),
  );
}

export function openDatabase(dbPath: string): Db {
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  registerHelpers(db);
  return db;
}

export function migrate(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      emailLower TEXT NOT NULL,
      company TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email_lower ON clients (emailLower);

    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      valueInCents INTEGER NOT NULL CHECK (valueInCents >= 0),
      clientId INTEGER NOT NULL REFERENCES clients (id),
      stage TEXT NOT NULL CHECK (stage IN ('new', 'contact', 'proposal', 'won')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_deals_client ON deals (clientId);
    CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals (stage);
  `);
}

/** Removes the sqlite file and its side files so `db:setup` is fully repeatable. */
export function dropDatabaseFiles(dbPath: string): void {
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    const target = `${dbPath}${suffix}`;
    if (fs.existsSync(target)) {
      fs.rmSync(target, { force: true });
    }
  }
}

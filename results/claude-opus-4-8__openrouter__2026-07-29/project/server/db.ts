import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

export type DB = Database.Database;

export const DEFAULT_DB_PATH = "./.data/eli-llm-bench.sqlite";

export function resolveDbPath(dbPath?: string): string {
  return path.resolve(process.cwd(), dbPath ?? process.env.DB_PATH ?? DEFAULT_DB_PATH);
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email ON clients (LOWER(email));

CREATE TABLE IF NOT EXISTS deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  valueInCents INTEGER NOT NULL,
  clientId INTEGER NOT NULL REFERENCES clients(id),
  stage TEXT NOT NULL CHECK (stage IN ('new','contact','proposal','won')),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deals_client ON deals (clientId);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals (stage);
`;

/** Opens the database, ensuring the directory and schema exist. */
export function openDb(dbPath?: string): DB {
  const isMemory = dbPath === ":memory:";
  const resolved = isMemory ? ":memory:" : resolveDbPath(dbPath);
  if (!isMemory) {
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
  }
  const db = new Database(resolved);
  if (!isMemory) db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

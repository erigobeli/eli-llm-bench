import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export const resolvedDbPath = path.resolve(
  process.cwd(),
  process.env.DB_PATH && process.env.DB_PATH.trim() !== ''
    ? process.env.DB_PATH
    : './.data/eli-llm-bench.sqlite'
);

const SCHEMA = `
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email_nocase
  ON clients (email COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  value_in_cents INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('new', 'contact', 'proposal', 'won')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_deals_client ON deals (client_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals (stage);
`;

let connection: Database.Database | null = null;

export function migrate(database: Database.Database): void {
  database.pragma('foreign_keys = ON');
  database.exec(SCHEMA);
}

export function getDb(): Database.Database {
  if (!connection) {
    fs.mkdirSync(path.dirname(resolvedDbPath), { recursive: true });
    connection = new Database(resolvedDbPath);
    connection.pragma('journal_mode = WAL');
    migrate(connection);
  }
  return connection;
}

export function closeDb(): void {
  if (connection) {
    connection.close();
    connection = null;
  }
}

export function recreateDatabase(): Database.Database {
  closeDb();
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(resolvedDbPath + suffix, { force: true });
  }
  fs.mkdirSync(path.dirname(resolvedDbPath), { recursive: true });
  const database = new Database(resolvedDbPath);
  database.pragma('journal_mode = WAL');
  migrate(database);
  return database;
}

export function nowIso(): string {
  return new Date().toISOString();
}

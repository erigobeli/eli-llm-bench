import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export type AppDatabase = Database.Database;

export const DEFAULT_DB_PATH = './.data/eli-llm-bench.sqlite';

/** Resolve o caminho do banco a partir do parâmetro, de DB_PATH ou do padrão. */
export function resolveDbPath(dbPath?: string): string {
  const raw = dbPath ?? process.env.DB_PATH ?? DEFAULT_DB_PATH;
  return path.resolve(process.cwd(), raw);
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS clients (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  company    TEXT,
  createdAt  TEXT NOT NULL,
  updatedAt  TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email_lower ON clients (lower(email));

CREATE TABLE IF NOT EXISTS deals (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  valueInCents INTEGER NOT NULL CHECK (valueInCents >= 0),
  clientId     INTEGER NOT NULL REFERENCES clients (id),
  stage        TEXT NOT NULL CHECK (stage IN ('new', 'contact', 'proposal', 'won')),
  createdAt    TEXT NOT NULL,
  updatedAt    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deals_client ON deals (clientId);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals (stage);
`;

export function applySchema(db: AppDatabase): void {
  db.exec(SCHEMA_SQL);
}

/** Abre (criando se necessário) o banco SQLite e garante o schema. */
export function openDatabase(dbPath?: string): AppDatabase {
  const file = resolveDbPath(dbPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  applySchema(db);
  return db;
}

/** Remove o arquivo do banco e os arquivos auxiliares do WAL. */
export function removeDatabaseFiles(dbPath?: string): void {
  const file = resolveDbPath(dbPath);
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    fs.rmSync(`${file}${suffix}`, { force: true });
  }
}

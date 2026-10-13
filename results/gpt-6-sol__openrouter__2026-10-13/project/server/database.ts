import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const dbPath = () => resolve(process.env.DB_PATH || './.data/eli-llm-bench.sqlite');

export function openDatabase(path = dbPath()) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  return db;
}

export function createSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      company TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      valueInCents INTEGER NOT NULL CHECK (valueInCents >= 0),
      clientId INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
      stage TEXT NOT NULL CHECK (stage IN ('new', 'contact', 'proposal', 'won')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_deals_client ON deals(clientId);
    CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
  `);
}

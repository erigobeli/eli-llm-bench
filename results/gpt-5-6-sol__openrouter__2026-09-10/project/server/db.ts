import Database from "better-sqlite3";
import path from "node:path";

export type AppDatabase = Database.Database;

export function defaultDbPath() {
  return path.resolve(process.env.DB_PATH || ".data/eli-llm-bench.sqlite");
}

export function openDatabase(filename = defaultDbPath()) {
  const db = new Database(filename);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  return db;
}

export function createSchema(db: AppDatabase) {
  db.exec(`
    CREATE TABLE clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      company TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      valueInCents INTEGER NOT NULL CHECK (valueInCents >= 0),
      clientId INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
      stage TEXT NOT NULL CHECK (stage IN ('new', 'contact', 'proposal', 'won')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX deals_client_idx ON deals(clientId);
    CREATE INDEX deals_stage_idx ON deals(stage);
  `);
}

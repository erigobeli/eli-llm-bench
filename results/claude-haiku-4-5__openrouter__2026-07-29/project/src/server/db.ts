import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', '.data', 'eli-llm-bench.sqlite');

export interface Client {
  id: number;
  name: string;
  email: string;
  company: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: number;
  title: string;
  valueInCents: number;
  clientId: number;
  stage: 'new' | 'contact' | 'proposal' | 'won';
  createdAt: string;
  updatedAt: string;
}

let db: Database.Database;

export function initDb(): Database.Database {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      company TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      valueInCents INTEGER NOT NULL,
      clientId INTEGER NOT NULL REFERENCES clients(id),
      stage TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_deals_clientId ON deals(clientId);
    CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
  `);

  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    initDb();
  }
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
  }
}

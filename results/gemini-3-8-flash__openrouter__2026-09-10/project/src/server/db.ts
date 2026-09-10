import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

export function getDbPath(): string {
  const envPath = process.env.DB_PATH;
  if (envPath) {
    if (envPath === ':memory:') {
      return ':memory:';
    }
    return path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
  }
  return path.resolve(process.cwd(), '.data', 'eli-llm-bench.sqlite');
}

export function initSchema(db: Database.Database): void {
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      company TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      valueInCents INTEGER NOT NULL,
      clientId INTEGER NOT NULL,
      stage TEXT NOT NULL CHECK(stage IN ('new', 'contact', 'proposal', 'won')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_deals_clientId ON deals(clientId);
    CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
  `);
}

let activeDb: Database.Database | null = null;

export function getDb(customPath?: string): Database.Database {
  if (customPath) {
    if (customPath !== ':memory:') {
      fs.mkdirSync(path.dirname(customPath), { recursive: true });
    }
    const db = new Database(customPath);
    initSchema(db);
    return db;
  }

  if (!activeDb) {
    const dbPath = getDbPath();
    if (dbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    activeDb = new Database(dbPath);
    initSchema(activeDb);
  }

  return activeDb;
}

export function closeDb(): void {
  if (activeDb) {
    activeDb.close();
    activeDb = null;
  }
}

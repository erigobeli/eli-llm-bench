import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export const DEFAULT_DB_PATH = "./.data/eli-llm-bench.sqlite";

export function resolveDbPath(): string {
  return process.env.DB_PATH && process.env.DB_PATH.trim() !== ""
    ? process.env.DB_PATH
    : DEFAULT_DB_PATH;
}

export function openDatabase(dbPath: string): Database.Database {
  const dir = path.dirname(path.resolve(dbPath));
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function createSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE,
      company TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email ON clients(email COLLATE NOCASE);

    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      valueInCents INTEGER NOT NULL CHECK (valueInCents >= 0),
      clientId INTEGER NOT NULL REFERENCES clients(id),
      stage TEXT NOT NULL CHECK (stage IN ('new','contact','proposal','won')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_deals_clientId ON deals(clientId);
    CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
  `);
}

export interface SeedClient {
  id: number;
  name: string;
  email: string;
  company: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SeedDeal {
  id: number;
  title: string;
  valueInCents: number;
  clientId: number;
  stage: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeedData {
  version: string;
  clients: SeedClient[];
  deals: SeedDeal[];
}

export function loadSeed(db: Database.Database, seed: SeedData): void {
  const insertClient = db.prepare(
    `INSERT INTO clients (id, name, email, company, createdAt, updatedAt)
     VALUES (@id, @name, @email, @company, @createdAt, @updatedAt)`
  );
  const insertDeal = db.prepare(
    `INSERT INTO deals (id, title, valueInCents, clientId, stage, createdAt, updatedAt)
     VALUES (@id, @title, @valueInCents, @clientId, @stage, @createdAt, @updatedAt)`
  );
  const run = db.transaction(() => {
    for (const c of seed.clients) insertClient.run(c);
    for (const d of seed.deals) insertDeal.run(d);
  });
  run();
}

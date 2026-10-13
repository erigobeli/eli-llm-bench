import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export type Stage = 'new' | 'contact' | 'proposal' | 'won';

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
  stage: Stage;
  createdAt: string;
  updatedAt: string;
}

export function createDatabase(filename = ':memory:'): Database.Database {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  const db = new Database(filename);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
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
      valueInCents INTEGER NOT NULL CHECK (valueInCents >= 0),
      clientId INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
      stage TEXT NOT NULL CHECK (stage IN ('new', 'contact', 'proposal', 'won')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS deals_client_id ON deals(clientId);
    CREATE INDEX IF NOT EXISTS deals_stage ON deals(stage);
  `);
  return db;
}

export function setupDatabase(filename: string, seedFilename: string): void {
  const absolute = path.resolve(filename);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  for (const suffix of ['', '-wal', '-shm']) {
    const candidate = `${absolute}${suffix}`;
    if (fs.existsSync(candidate)) fs.rmSync(candidate, { force: true });
  }
  const seed = JSON.parse(fs.readFileSync(seedFilename, 'utf8')) as { clients: Client[]; deals: Deal[] };
  const db = createDatabase(absolute);
  const insertClient = db.prepare('INSERT INTO clients (id, name, email, company, createdAt, updatedAt) VALUES (@id, @name, @email, @company, @createdAt, @updatedAt)');
  const insertDeal = db.prepare('INSERT INTO deals (id, title, valueInCents, clientId, stage, createdAt, updatedAt) VALUES (@id, @title, @valueInCents, @clientId, @stage, @createdAt, @updatedAt)');
  const load = db.transaction(() => {
    for (const client of seed.clients) insertClient.run(client);
    for (const deal of seed.deals) insertDeal.run(deal);
  });
  try {
    load();
  } finally {
    db.close();
  }
}

export function timestampAfter(previous?: string): string {
  const now = Date.now();
  const old = previous ? Date.parse(previous) : 0;
  return new Date(Math.max(now, Number.isFinite(old) ? old + 1 : now)).toISOString();
}

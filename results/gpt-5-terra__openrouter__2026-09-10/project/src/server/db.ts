import Database from 'better-sqlite3';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export type Stage = 'new' | 'contact' | 'proposal' | 'won';

export const defaultDbPath = () => resolve(process.env.DB_PATH || './.data/eli-llm-bench.sqlite');

export function openDatabase(dbPath = defaultDbPath()) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  return db;
}

export function createSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      company TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      value_in_cents INTEGER NOT NULL CHECK(value_in_cents >= 0),
      client_id INTEGER NOT NULL REFERENCES clients(id),
      stage TEXT NOT NULL CHECK(stage IN ('new', 'contact', 'proposal', 'won')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_deals_client_id ON deals(client_id);
    CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
  `);
}

type Seed = {
  clients: Array<{ id: number; name: string; email: string; company: string | null; createdAt: string; updatedAt: string }>;
  deals: Array<{ id: number; title: string; valueInCents: number; clientId: number; stage: Stage; createdAt: string; updatedAt: string }>;
};

export function recreateDatabase(dbPath = defaultDbPath()) {
  rmSync(dbPath, { force: true });
  const db = openDatabase(dbPath);
  createSchema(db);
  const seed = JSON.parse(readFileSync(resolve('seed-data.json'), 'utf8')) as Seed;
  const addClient = db.prepare('INSERT INTO clients (id, name, email, company, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
  const addDeal = db.prepare('INSERT INTO deals (id, title, value_in_cents, client_id, stage, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  db.transaction(() => {
    for (const client of seed.clients) addClient.run(client.id, client.name, client.email, client.company, client.createdAt, client.updatedAt);
    for (const deal of seed.deals) addDeal.run(deal.id, deal.title, deal.valueInCents, deal.clientId, deal.stage, deal.createdAt, deal.updatedAt);
  })();
  db.close();
}

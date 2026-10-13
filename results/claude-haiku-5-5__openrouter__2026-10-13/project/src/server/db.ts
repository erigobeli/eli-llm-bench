import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

export type Db = Database.Database;

export const DEFAULT_DB_PATH = './.data/eli-llm-bench.sqlite';
export const SEED_PATH = fileURLToPath(new URL('../../seed-data.json', import.meta.url));

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

export interface SeedFile {
  version?: string;
  clients: SeedClient[];
  deals: SeedDeal[];
}

export function resolveDbPath(): string {
  return resolve(process.env.DB_PATH || DEFAULT_DB_PATH);
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS clients_email_unique ON clients (email COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  value_in_cents INTEGER NOT NULL CHECK (value_in_cents >= 0),
  client_id INTEGER NOT NULL REFERENCES clients (id),
  stage TEXT NOT NULL CHECK (stage IN ('new', 'contact', 'proposal', 'won')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS deals_client_idx ON deals (client_id);
CREATE INDEX IF NOT EXISTS deals_stage_idx ON deals (stage);
`;

/** Normaliza texto para buscas sem diferenciar caixa nem acentos. */
export function foldText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value).normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
}

export function openDatabase(path: string = resolveDbPath()): Db {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.function('fold_text', { deterministic: true }, (value: unknown) => foldText(value));
  db.exec(SCHEMA);
  return db;
}

/** Carrega o seed exatamente como está no arquivo, com os mesmos ids. */
export function seedDatabase(db: Db, seed: SeedFile): { clients: number; deals: number } {
  const insertClient = db.prepare(
    'INSERT INTO clients (id, name, email, company, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const insertDeal = db.prepare(
    'INSERT INTO deals (id, title, value_in_cents, client_id, stage, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  const run = db.transaction((data: SeedFile) => {
    for (const c of data.clients) {
      insertClient.run(c.id, c.name, c.email.toLowerCase(), c.company, c.createdAt, c.updatedAt);
    }
    for (const d of data.deals) {
      insertDeal.run(d.id, d.title, d.valueInCents, d.clientId, d.stage, d.createdAt, d.updatedAt);
    }
  });
  run(seed);
  return { clients: seed.clients.length, deals: seed.deals.length };
}

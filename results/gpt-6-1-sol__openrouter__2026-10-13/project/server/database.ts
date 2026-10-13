import Database from 'better-sqlite3';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import type { Client, Deal } from '../shared/types.js';

export const defaultDbPath = './.data/eli-llm-bench.sqlite';
const seedHash = '6dd8f6d95f75404f8e1dc75088141913c2c9ac334168a27ffbf9a86b7596c522';

export function openDatabase(path = process.env.DB_PATH || defaultDbPath) {
  if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.function('casefold', { deterministic: true }, (value: unknown) =>
    typeof value === 'string' ? value.toLocaleLowerCase('pt-BR') : '');
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 2 AND 80),
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      company TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 2 AND 120),
      valueInCents INTEGER NOT NULL CHECK(valueInCents >= 0 AND typeof(valueInCents) = 'integer'),
      clientId INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
      stage TEXT NOT NULL CHECK(stage IN ('new', 'contact', 'proposal', 'won')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS deals_client ON deals(clientId);
    CREATE INDEX IF NOT EXISTS deals_stage ON deals(stage);
  `);
  return db;
}

export function setupDatabase(path = process.env.DB_PATH || defaultDbPath) {
  const bytes = readFileSync(resolve('seed-data.json'));
  if (createHash('sha256').update(bytes).digest('hex') !== seedHash) {
    throw new Error('O seed não corresponde ao SHA-256 esperado. Nenhum dado foi alterado.');
  }
  const seed = JSON.parse(bytes.toString('utf8')) as { clients: Client[]; deals: Deal[] };
  if (path !== ':memory:') {
    for (const suffix of ['', '-wal', '-shm']) rmSync(resolve(path) + suffix, { force: true });
  }
  const db = openDatabase(path);
  try {
    db.transaction(() => {
      const insertClient = db.prepare(`INSERT INTO clients
        (id, name, email, company, createdAt, updatedAt)
        VALUES (@id, @name, @email, @company, @createdAt, @updatedAt)`);
      const insertDeal = db.prepare(`INSERT INTO deals
        (id, title, valueInCents, clientId, stage, createdAt, updatedAt)
        VALUES (@id, @title, @valueInCents, @clientId, @stage, @createdAt, @updatedAt)`);
      seed.clients.forEach(client => insertClient.run(client));
      seed.deals.forEach(deal => insertDeal.run(deal));
    })();
  } finally {
    db.close();
  }
  return { clients: seed.clients.length, deals: seed.deals.length };
}

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { Client, Deal } from './types';

export type Db = Database.Database;

export const DEFAULT_DB_PATH = path.join('.data', 'eli-llm-bench.sqlite');

export function resolveDbPath(raw?: string): string {
  const value = raw && raw.trim().length > 0 ? raw.trim() : DEFAULT_DB_PATH;
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

function ensureDirectory(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** Abre (ou cria) o banco SQLite e garante o schema da aplicação. */
export function openDatabase(dbPath: string): Db {
  ensureDirectory(dbPath);
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  createSchema(db);
  return db;
}

export function createSchema(db: Db): void {
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
      clientId INTEGER NOT NULL REFERENCES clients(id),
      stage TEXT NOT NULL CHECK (stage IN ('new', 'contact', 'proposal', 'won')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_deals_clientId ON deals (clientId);
    CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals (stage);
  `);
}

/** Remove o arquivo do banco (e arquivos auxiliares do WAL), se existirem. */
export function removeDatabaseFiles(dbPath: string): void {
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    const target = `${dbPath}${suffix}`;
    if (fs.existsSync(target)) {
      fs.rmSync(target, { force: true });
    }
  }
}

export interface SeedFile {
  version?: string;
  clients: Client[];
  deals: Deal[];
}

/** Carrega o seed imutável dentro de um banco vazio. */
export function loadSeed(db: Db, seed: SeedFile): void {
  const insertClient = db.prepare(
    `INSERT INTO clients (id, name, email, company, createdAt, updatedAt)
     VALUES (@id, @name, @email, @company, @createdAt, @updatedAt)`,
  );
  const insertDeal = db.prepare(
    `INSERT INTO deals (id, title, valueInCents, clientId, stage, createdAt, updatedAt)
     VALUES (@id, @title, @valueInCents, @clientId, @stage, @createdAt, @updatedAt)`,
  );

  const run = db.transaction(() => {
    db.prepare('DELETE FROM deals').run();
    db.prepare('DELETE FROM clients').run();
    for (const client of seed.clients) {
      insertClient.run({
        id: client.id,
        name: client.name,
        email: client.email,
        company: client.company ?? null,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
      });
    }
    for (const deal of seed.deals) {
      insertDeal.run({
        id: deal.id,
        title: deal.title,
        valueInCents: deal.valueInCents,
        clientId: deal.clientId,
        stage: deal.stage,
        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt,
      });
    }
  });

  run();
}

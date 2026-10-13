import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { SeedData } from '../types.js';

let activeDb: Database.Database | null = null;
let activeDbPath: string | null = null;

export function resolveDbPath(customPath?: string): string {
  const rawPath = customPath || process.env.DB_PATH || './.data/eli-llm-bench.sqlite';
  return path.resolve(process.cwd(), rawPath);
}

export function createSchema(db: Database.Database): void {
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
      value_in_cents INTEGER NOT NULL CHECK (value_in_cents >= 0),
      client_id INTEGER NOT NULL,
      stage TEXT NOT NULL CHECK (stage IN ('new', 'contact', 'proposal', 'won')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT
    );
  `);
}

export function loadSeedDataFile(): SeedData {
  const seedFilePath = path.resolve(process.cwd(), 'seed-data.json');
  const content = fs.readFileSync(seedFilePath, 'utf-8');
  return JSON.parse(content) as SeedData;
}

export function seedDatabase(db: Database.Database): void {
  const seed = loadSeedDataFile();

  const insertClient = db.prepare(`
    INSERT INTO clients (id, name, email, company, created_at, updated_at)
    VALUES (@id, @name, @email, @company, @createdAt, @updatedAt)
  `);

  const insertDeal = db.prepare(`
    INSERT INTO deals (id, title, value_in_cents, client_id, stage, created_at, updated_at)
    VALUES (@id, @title, @valueInCents, @clientId, @stage, @createdAt, @updatedAt)
  `);

  const tx = db.transaction(() => {
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

  tx();
}

function configureDatabase(db: Database.Database): void {
  db.pragma('foreign_keys = ON');
  db.function('ulower', { deterministic: true }, (val: unknown) => {
    if (typeof val !== 'string') return '';
    return val.toLowerCase();
  });
}

export function getDb(customPath?: string): Database.Database {
  const resolvedPath = resolveDbPath(customPath);

  if (activeDb && activeDbPath === resolvedPath && activeDb.open) {
    return activeDb;
  }

  if (activeDb && activeDb.open) {
    activeDb.close();
  }

  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const existedBefore = fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).size > 0;
  const db = new Database(resolvedPath);
  configureDatabase(db);
  createSchema(db);

  if (!existedBefore) {
    const countRow = db.prepare('SELECT COUNT(*) as count FROM clients').get() as { count: number };
    if (countRow.count === 0) {
      seedDatabase(db);
    }
  }

  activeDb = db;
  activeDbPath = resolvedPath;
  return db;
}

export function closeDb(): void {
  if (activeDb && activeDb.open) {
    activeDb.close();
  }
  activeDb = null;
  activeDbPath = null;
}

export function resetAndSeedDatabase(customPath?: string): void {
  const resolvedPath = resolveDbPath(customPath);

  if (activeDb && activeDbPath === resolvedPath && activeDb.open) {
    activeDb.close();
    activeDb = null;
    activeDbPath = null;
  }

  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  for (const suffix of ['', '-wal', '-shm']) {
    const fileToRemove = `${resolvedPath}${suffix}`;
    if (fs.existsSync(fileToRemove)) {
      try {
        fs.rmSync(fileToRemove, { force: true });
      } catch {
        // Ignore if file is held open by another process; tables will be dropped below
      }
    }
  }

  const db = new Database(resolvedPath);
  try {
    db.pragma('foreign_keys = OFF');
    db.exec(`
      DROP TABLE IF EXISTS deals;
      DROP TABLE IF EXISTS clients;
    `);
    db.pragma('foreign_keys = ON');
    configureDatabase(db);
    createSchema(db);
    seedDatabase(db);
  } finally {
    db.close();
  }
}

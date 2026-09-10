import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { STAGES } from "../shared/types";

export type DB = Database.Database;

export const DEFAULT_DB_PATH = "./.data/eli-llm-bench.sqlite";

export function resolveDbPath(dbPath?: string): string {
  return path.resolve(process.cwd(), dbPath || process.env.DB_PATH || DEFAULT_DB_PATH);
}

export function openDatabase(dbPath: string): DB {
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function createSchema(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      company TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS clients_email_unique ON clients (lower(email));

    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      value_in_cents INTEGER NOT NULL CHECK (value_in_cents >= 0),
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
      stage TEXT NOT NULL CHECK (stage IN (${STAGES.map((s) => `'${s}'`).join(", ")})),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS deals_client_id ON deals (client_id);
    CREATE INDEX IF NOT EXISTS deals_stage ON deals (stage);
  `);
}

interface SeedFile {
  clients: Array<{
    id: number;
    name: string;
    email: string;
    company: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  deals: Array<{
    id: number;
    title: string;
    valueInCents: number;
    clientId: number;
    stage: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export function loadSeed(db: DB, seedPath: string): void {
  const raw = fs.readFileSync(seedPath, "utf8");
  const seed = JSON.parse(raw) as SeedFile;

  const insertClient = db.prepare(
    `INSERT INTO clients (id, name, email, company, created_at, updated_at)
     VALUES (@id, @name, @email, @company, @createdAt, @updatedAt)`,
  );
  const insertDeal = db.prepare(
    `INSERT INTO deals (id, title, value_in_cents, client_id, stage, created_at, updated_at)
     VALUES (@id, @title, @valueInCents, @clientId, @stage, @createdAt, @updatedAt)`,
  );

  const run = db.transaction(() => {
    db.exec("DELETE FROM deals; DELETE FROM clients; DELETE FROM sqlite_sequence;");
    for (const c of seed.clients) insertClient.run(c);
    for (const d of seed.deals) insertDeal.run(d);
  });
  run();
}

/** Recreates the database file from scratch, creating schema and loading the seed. */
export function resetDatabase(dbPath: string, seedPath: string): DB {
  if (dbPath !== ":memory:") {
    for (const suffix of ["", "-wal", "-shm", "-journal"]) {
      const file = dbPath + suffix;
      if (fs.existsSync(file)) fs.rmSync(file, { force: true });
    }
  }
  const db = openDatabase(dbPath);
  createSchema(db);
  loadSeed(db, seedPath);
  return db;
}

export function defaultSeedPath(): string {
  return path.resolve(process.cwd(), "seed-data.json");
}

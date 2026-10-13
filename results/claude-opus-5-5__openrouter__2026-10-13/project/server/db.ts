import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type DB = Database.Database;

export const DEFAULT_DB_PATH = "./.data/eli-llm-bench.sqlite";

export function resolveDbPath(dbPath?: string): string {
  return path.resolve(process.cwd(), dbPath && dbPath.trim() ? dbPath : DEFAULT_DB_PATH);
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email ON clients (lower(email));

CREATE TABLE IF NOT EXISTS deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  value_in_cents INTEGER NOT NULL CHECK (value_in_cents >= 0),
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  stage TEXT NOT NULL CHECK (stage IN ('new','contact','proposal','won')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_deals_client ON deals (client_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals (stage);
`;

export function openDatabase(dbPath: string): DB {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(SCHEMA);
  return db;
}

interface SeedData {
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

export function findSeedFile(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(process.cwd(), "seed-data.json"),
    path.resolve(here, "..", "seed-data.json"),
    path.resolve(here, "..", "..", "seed-data.json"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("Arquivo seed-data.json não encontrado.");
}

export function loadSeed(db: DB, seedPath = findSeedFile()): void {
  const seed = JSON.parse(fs.readFileSync(seedPath, "utf8")) as SeedData;
  const insertClient = db.prepare(
    `INSERT INTO clients (id, name, email, company, created_at, updated_at)
     VALUES (@id, @name, @email, @company, @createdAt, @updatedAt)`,
  );
  const insertDeal = db.prepare(
    `INSERT INTO deals (id, title, value_in_cents, client_id, stage, created_at, updated_at)
     VALUES (@id, @title, @valueInCents, @clientId, @stage, @createdAt, @updatedAt)`,
  );
  db.transaction(() => {
    db.exec("DELETE FROM deals; DELETE FROM clients;");
    for (const c of seed.clients) insertClient.run({ ...c, company: c.company ?? null });
    for (const d of seed.deals) insertDeal.run(d);
  })();
}

function removeDbFiles(dbPath: string): void {
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    fs.rmSync(dbPath + suffix, { force: true });
  }
}

/** Recria o banco do zero: apaga o arquivo, cria o schema e carrega o seed. */
export function setupDatabase(dbPath: string, seedPath?: string): void {
  try {
    removeDbFiles(dbPath);
  } catch {
    // Arquivo em uso (ex.: servidor aberto no Windows): recria as tabelas no lugar.
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const existing = new Database(dbPath);
    existing.pragma("busy_timeout = 5000");
    existing.exec("PRAGMA foreign_keys = OFF; DROP TABLE IF EXISTS deals; DROP TABLE IF EXISTS clients;");
    existing.close();
  }
  const db = openDatabase(dbPath);
  try {
    loadSeed(db, seedPath);
  } finally {
    db.close();
  }
}

/** Abre o banco; se ainda não existir, cria e carrega o seed. */
export function openOrInitDatabase(dbPath: string): DB {
  const exists = fs.existsSync(dbPath);
  if (!exists) setupDatabase(dbPath);
  return openDatabase(dbPath);
}

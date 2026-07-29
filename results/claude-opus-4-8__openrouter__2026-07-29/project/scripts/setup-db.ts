import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { resolveDbPath } from "../server/db";

interface SeedClient {
  id: number;
  name: string;
  email: string;
  company: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SeedDeal {
  id: number;
  title: string;
  valueInCents: number;
  clientId: number;
  stage: string;
  createdAt: string;
  updatedAt: string;
}

interface Seed {
  clients: SeedClient[];
  deals: SeedDeal[];
}

const SCHEMA = `
CREATE TABLE clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_clients_email ON clients (LOWER(email));

CREATE TABLE deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  valueInCents INTEGER NOT NULL,
  clientId INTEGER NOT NULL REFERENCES clients(id),
  stage TEXT NOT NULL CHECK (stage IN ('new','contact','proposal','won')),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX idx_deals_client ON deals (clientId);
CREATE INDEX idx_deals_stage ON deals (stage);
`;

function main(): void {
  const dbPath = resolveDbPath();
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });

  // Remove any existing database (including WAL/SHM sidecar files) to recreate cleanly.
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    const f = dbPath + suffix;
    if (fs.existsSync(f)) fs.rmSync(f);
  }

  const seedPath = path.resolve(process.cwd(), "seed-data.json");
  const seed = JSON.parse(fs.readFileSync(seedPath, "utf-8")) as Seed;

  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);

  const insertClient = db.prepare(
    `INSERT INTO clients (id, name, email, company, createdAt, updatedAt)
     VALUES (@id, @name, @email, @company, @createdAt, @updatedAt)`
  );
  const insertDeal = db.prepare(
    `INSERT INTO deals (id, title, valueInCents, clientId, stage, createdAt, updatedAt)
     VALUES (@id, @title, @valueInCents, @clientId, @stage, @createdAt, @updatedAt)`
  );

  const tx = db.transaction(() => {
    for (const c of seed.clients) insertClient.run(c);
    for (const d of seed.deals) insertDeal.run(d);
  });
  tx();

  const clientCount = (db.prepare("SELECT COUNT(*) AS c FROM clients").get() as any).c;
  const dealCount = (db.prepare("SELECT COUNT(*) AS c FROM deals").get() as any).c;
  db.close();

  // eslint-disable-next-line no-console
  console.log(`Banco recriado em: ${dbPath}`);
  // eslint-disable-next-line no-console
  console.log(`Clientes carregados: ${clientCount} | Negócios carregados: ${dealCount}`);
}

main();

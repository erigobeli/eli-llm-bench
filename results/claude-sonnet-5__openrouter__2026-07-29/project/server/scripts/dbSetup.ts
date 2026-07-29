import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDb, getDbPath, closeDb } from "../db.js";
import { SCHEMA_SQL } from "../schema.js";

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

interface SeedFile {
  version: string;
  clients: SeedClient[];
  deals: SeedDeal[];
}

function findSeedPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "seed-data.json"),
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "seed-data.json")
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error("seed-data.json não encontrado.");
}

function main(): void {
  const dbPath = getDbPath();
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath);
  }
  for (const suffix of ["-wal", "-shm"]) {
    const sidecar = `${dbPath}${suffix}`;
    if (fs.existsSync(sidecar)) {
      fs.rmSync(sidecar);
    }
  }

  const db = getDb();
  db.exec(SCHEMA_SQL);

  const seedPath = findSeedPath();
  const raw = fs.readFileSync(seedPath, "utf-8");
  const seed: SeedFile = JSON.parse(raw);

  const insertClient = db.prepare(
    `INSERT INTO clients (id, name, email, email_lower, company, created_at, updated_at)
     VALUES (@id, @name, @email, @emailLower, @company, @createdAt, @updatedAt)`
  );

  const insertDeal = db.prepare(
    `INSERT INTO deals (id, title, value_in_cents, client_id, stage, created_at, updated_at)
     VALUES (@id, @title, @valueInCents, @clientId, @stage, @createdAt, @updatedAt)`
  );

  const insertAll = db.transaction(() => {
    for (const client of seed.clients) {
      insertClient.run({
        id: client.id,
        name: client.name,
        email: client.email,
        emailLower: client.email.toLowerCase(),
        company: client.company,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt
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
        updatedAt: deal.updatedAt
      });
    }

    db.prepare(
      `UPDATE sqlite_sequence SET seq = (SELECT COALESCE(MAX(id), 0) FROM clients) WHERE name = 'clients'`
    ).run();
    db.prepare(
      `UPDATE sqlite_sequence SET seq = (SELECT COALESCE(MAX(id), 0) FROM deals) WHERE name = 'deals'`
    ).run();
  });

  insertAll();

  const clientCount = (db.prepare("SELECT COUNT(*) as count FROM clients").get() as { count: number }).count;
  const dealCount = (db.prepare("SELECT COUNT(*) as count FROM deals").get() as { count: number }).count;

  console.log(`Banco recriado em: ${dbPath}`);
  console.log(`Clientes carregados: ${clientCount}`);
  console.log(`Negócios carregados: ${dealCount}`);

  closeDb();
}

main();

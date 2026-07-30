import fs from "node:fs";
import path from "node:path";
import type { Db } from "./db";
import { STAGES, type Stage } from "./domain";

export interface SeedFile {
  version: string;
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
    stage: Stage;
    createdAt: string;
    updatedAt: string;
  }>;
}

export function resolveSeedPath(): string {
  const candidates = [
    path.resolve(__dirname, "..", "..", "seed-data.json"),
    path.resolve(__dirname, "..", "..", "..", "seed-data.json"),
    path.resolve(process.cwd(), "seed-data.json"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error("Arquivo seed-data.json não encontrado no projeto.");
}

export function readSeedFile(seedPath = resolveSeedPath()): SeedFile {
  const raw = fs.readFileSync(seedPath, "utf8");
  const parsed = JSON.parse(raw) as SeedFile;
  if (!Array.isArray(parsed.clients) || !Array.isArray(parsed.deals)) {
    throw new Error("O arquivo seed-data.json não possui o formato esperado.");
  }
  for (const deal of parsed.deals) {
    if (!STAGES.includes(deal.stage)) {
      throw new Error(`Etapa inválida no seed: ${String(deal.stage)}`);
    }
  }
  return parsed;
}

/** Loads the immutable seed exactly as provided. Idempotent: clears tables first. */
export function seedDatabase(db: Db, seed: SeedFile = readSeedFile()): void {
  const insertClient = db.prepare(
    `INSERT INTO clients (id, name, email, emailLower, company, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertDeal = db.prepare(
    `INSERT INTO deals (id, title, valueInCents, clientId, stage, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  db.transaction(() => {
    db.prepare("DELETE FROM deals").run();
    db.prepare("DELETE FROM clients").run();

    for (const client of seed.clients) {
      insertClient.run(
        client.id,
        client.name,
        client.email,
        client.email.toLowerCase(),
        client.company ?? null,
        client.createdAt,
        client.updatedAt,
      );
    }
    for (const deal of seed.deals) {
      insertDeal.run(
        deal.id,
        deal.title,
        deal.valueInCents,
        deal.clientId,
        deal.stage,
        deal.createdAt,
        deal.updatedAt,
      );
    }

    const maxClient = seed.clients.reduce((acc, item) => Math.max(acc, item.id), 0);
    const maxDeal = seed.deals.reduce((acc, item) => Math.max(acc, item.id), 0);
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('clients', 'deals')").run();
    db.prepare("INSERT INTO sqlite_sequence (name, seq) VALUES ('clients', ?)").run(
      maxClient,
    );
    db.prepare("INSERT INTO sqlite_sequence (name, seq) VALUES ('deals', ?)").run(
      maxDeal,
    );
  })();
}

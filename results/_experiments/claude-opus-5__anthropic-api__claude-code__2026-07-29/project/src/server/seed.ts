import fs from 'node:fs';
import path from 'node:path';
import type { AppDatabase } from './db';
import type { Client, Deal } from './types';

export interface SeedFile {
  version: string;
  clients: Client[];
  deals: Deal[];
}

const moduleDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

export function resolveSeedPath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'seed-data.json'),
    path.resolve(moduleDir, '../../seed-data.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Arquivo seed-data.json não encontrado.');
}

export function readSeed(): SeedFile {
  return JSON.parse(fs.readFileSync(resolveSeedPath(), 'utf8')) as SeedFile;
}

/** Carrega o seed imutável em um banco vazio (idempotente por recriação). */
export function seedDatabase(db: AppDatabase, seed: SeedFile = readSeed()): void {
  const insertClient = db.prepare(
    `INSERT INTO clients (id, name, email, company, createdAt, updatedAt)
     VALUES (@id, @name, @email, @company, @createdAt, @updatedAt)`,
  );
  const insertDeal = db.prepare(
    `INSERT INTO deals (id, title, valueInCents, clientId, stage, createdAt, updatedAt)
     VALUES (@id, @title, @valueInCents, @clientId, @stage, @createdAt, @updatedAt)`,
  );

  const run = db.transaction((data: SeedFile) => {
    db.prepare('DELETE FROM deals').run();
    db.prepare('DELETE FROM clients').run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('clients', 'deals')").run();
    for (const client of data.clients) {
      insertClient.run({ ...client, company: client.company ?? null });
    }
    for (const deal of data.deals) {
      insertDeal.run(deal);
    }
  });

  run(seed);
}

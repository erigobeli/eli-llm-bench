import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { getDbPath, initSchema } from '../src/server/db.js';

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
  stage: 'new' | 'contact' | 'proposal' | 'won';
  createdAt: string;
  updatedAt: string;
}

interface SeedData {
  version: string;
  clients: SeedClient[];
  deals: SeedDeal[];
}

export function setupDatabase(customPath?: string): void {
  const dbPath = customPath || getDbPath();

  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Remove existing database files to cleanly recreate
    if (fs.existsSync(dbPath)) {
      try {
        fs.unlinkSync(dbPath);
      } catch (err) {
        // Fallback: If unlink fails for some reason, will recreate via drop
      }
    }
    const walPath = `${dbPath}-wal`;
    if (fs.existsSync(walPath)) {
      try {
        fs.unlinkSync(walPath);
      } catch {
        // ignore
      }
    }
    const shmPath = `${dbPath}-shm`;
    if (fs.existsSync(shmPath)) {
      try {
        fs.unlinkSync(shmPath);
      } catch {
        // ignore
      }
    }
  }

  const db = new Database(dbPath);
  db.pragma('foreign_keys = OFF'); // temporarily off while recreating tables if they still existed
  db.exec('DROP TABLE IF EXISTS deals;');
  db.exec('DROP TABLE IF EXISTS clients;');
  initSchema(db);

  const seedPath = path.resolve(process.cwd(), 'seed-data.json');
  if (!fs.existsSync(seedPath)) {
    throw new Error(`Arquivo seed-data.json não encontrado em ${seedPath}`);
  }

  const seedRaw = fs.readFileSync(seedPath, 'utf-8');
  const seed: SeedData = JSON.parse(seedRaw);

  const insertClient = db.prepare(`
    INSERT INTO clients (id, name, email, company, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertDeal = db.prepare(`
    INSERT INTO deals (id, title, valueInCents, clientId, stage, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const runSeeding = db.transaction(() => {
    for (const c of seed.clients) {
      insertClient.run(
        c.id,
        c.name.trim(),
        c.email.trim(),
        c.company ? c.company.trim() : null,
        c.createdAt,
        c.updatedAt
      );
    }

    for (const d of seed.deals) {
      insertDeal.run(
        d.id,
        d.title.trim(),
        d.valueInCents,
        d.clientId,
        d.stage,
        d.createdAt,
        d.updatedAt
      );
    }
  });

  runSeeding();
  db.close();

  console.log(`Banco configurado com sucesso em: ${dbPath}`);
}

// If executed directly
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('db-setup.ts') ||
  process.argv[1].endsWith('db-setup.js')
);

if (isDirectRun) {
  setupDatabase();
}

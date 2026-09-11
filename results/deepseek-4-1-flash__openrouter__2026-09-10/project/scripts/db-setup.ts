import fs from 'node:fs';
import path from 'node:path';
import { recreateDatabase, resolvedDbPath } from '../server/db';

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
  clients: SeedClient[];
  deals: SeedDeal[];
}

const seedPath = path.resolve(process.cwd(), 'seed-data.json');
const raw = fs.readFileSync(seedPath, 'utf8');
const seed = JSON.parse(raw) as SeedFile;

const db = recreateDatabase();

const insertClient = db.prepare(
  `INSERT INTO clients (id, name, email, company, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?)`
);
const insertDeal = db.prepare(
  `INSERT INTO deals (id, title, value_in_cents, client_id, stage, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

const load = db.transaction(() => {
  for (const client of seed.clients) {
    insertClient.run(
      client.id,
      client.name,
      client.email,
      client.company,
      client.createdAt,
      client.updatedAt
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
      deal.updatedAt
    );
  }
});

load();
db.close();

console.log(
  `Banco recriado em ${resolvedDbPath} com ${seed.clients.length} clientes e ${seed.deals.length} negócios.`
);

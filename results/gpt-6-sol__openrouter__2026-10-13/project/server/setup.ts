import { readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { createSchema, dbPath, openDatabase } from './database.js';

const path = dbPath();
rmSync(path, { force: true });
const db = openDatabase(path);
try {
  createSchema(db);
  const seed = JSON.parse(readFileSync(resolve('seed-data.json'), 'utf8')) as {
    clients: Array<{ id: number; name: string; email: string; company: string | null; createdAt: string; updatedAt: string }>;
    deals: Array<{ id: number; title: string; valueInCents: number; clientId: number; stage: string; createdAt: string; updatedAt: string }>;
  };
  const client = db.prepare('INSERT INTO clients (id, name, email, company, createdAt, updatedAt) VALUES (@id, @name, @email, @company, @createdAt, @updatedAt)');
  const deal = db.prepare('INSERT INTO deals (id, title, valueInCents, clientId, stage, createdAt, updatedAt) VALUES (@id, @title, @valueInCents, @clientId, @stage, @createdAt, @updatedAt)');
  db.transaction(() => {
    for (const item of seed.clients) client.run(item);
    for (const item of seed.deals) deal.run(item);
  })();
  console.log(`Banco recriado: ${seed.clients.length} clientes e ${seed.deals.length} negócios.`);
} finally {
  db.close();
}

import fs from 'node:fs';
import path from 'node:path';
import { createDatabase, databasePath, type Db } from './db.js';
import seed from '../../seed-data.json' with { type: 'json' };

const filename = databasePath();
if (filename !== ':memory:' && fs.existsSync(filename)) fs.rmSync(filename, { force: true });
const db: Db = createDatabase(filename);

const insertClient = db.prepare(`INSERT INTO clients (id, name, email, company, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`);
const insertDeal = db.prepare(`INSERT INTO deals (id, title, value_in_cents, client_id, stage, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
const load = db.transaction(() => {
  for (const client of seed.clients) insertClient.run(client.id, client.name, client.email, client.company, client.createdAt, client.updatedAt);
  for (const deal of seed.deals) insertDeal.run(deal.id, deal.title, deal.valueInCents, deal.clientId, deal.stage, deal.createdAt, deal.updatedAt);
});
load();
db.close();
console.log(`Banco preparado em ${path.resolve(filename)}`);

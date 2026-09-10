import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { createSchema, defaultDbPath } from "./db.js";
import type { Client, Deal } from "./types.js";

interface Seed { clients: Client[]; deals: Deal[] }

const dbPath = defaultDbPath();
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
for (const suffix of ["", "-wal", "-shm"]) {
  const file = `${dbPath}${suffix}`;
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

const seed = JSON.parse(fs.readFileSync(path.resolve("seed-data.json"), "utf8")) as Seed;
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");
createSchema(db);

const insertClient = db.prepare(`
  INSERT INTO clients (id, name, email, company, createdAt, updatedAt)
  VALUES (@id, @name, @email, @company, @createdAt, @updatedAt)
`);
const insertDeal = db.prepare(`
  INSERT INTO deals (id, title, valueInCents, clientId, stage, createdAt, updatedAt)
  VALUES (@id, @title, @valueInCents, @clientId, @stage, @createdAt, @updatedAt)
`);
db.transaction(() => {
  for (const client of seed.clients) insertClient.run(client);
  for (const deal of seed.deals) insertDeal.run(deal);
})();
db.close();
console.log(`Banco recriado com ${seed.clients.length} clientes e ${seed.deals.length} negócios.`);

#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '.data', 'eli-llm-bench.sqlite');

// Ensure directory exists
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Remove old database
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

// Create new database
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Create schema
db.exec(`
  DROP TABLE IF EXISTS deals;
  DROP TABLE IF EXISTS clients;

  CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    company TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    valueInCents INTEGER NOT NULL,
    clientId INTEGER NOT NULL REFERENCES clients(id),
    stage TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE INDEX idx_deals_clientId ON deals(clientId);
  CREATE INDEX idx_deals_stage ON deals(stage);
`);

// Load seed data
const seedPath = path.join(__dirname, '..', 'seed-data.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

const insertClient = db.prepare(`
  INSERT INTO clients (id, name, email, company, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertDeal = db.prepare(`
  INSERT INTO deals (id, title, valueInCents, clientId, stage, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// Insert clients
for (const client of seedData.clients) {
  insertClient.run(
    client.id,
    client.name,
    client.email,
    client.company,
    client.createdAt,
    client.updatedAt
  );
}

// Insert deals
for (const deal of seedData.deals) {
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

db.close();
console.log('Database setup completed successfully');

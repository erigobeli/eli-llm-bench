import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { initDb, getDb, closeDb } from '../server/db';
import { createClientsRouter } from '../server/routes/clients';
import { createDealsRouter } from '../server/routes/deals';
import { createDashboardRouter } from '../server/routes/dashboard';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.DB_PATH = path.join(__dirname, '..', '..', '.data', 'test.sqlite');

let app: any;
let server: any;

beforeAll(async () => {
  // Clean up test database
  const dbPath = process.env.DB_PATH!;
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  // Initialize app
  app = express();
  app.use(express.json());

  // Setup database
  initDb();
  const db = getDb();

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

  // Routes
  app.use('/api/clients', createClientsRouter());
  app.use('/api/deals', createDealsRouter());
  app.use('/api/dashboard', createDashboardRouter());

  // Health check
  app.get('/api/health', (req: any, res: any) => {
    res.json({ status: 'ok' });
  });

  server = await new Promise((resolve) => {
    const s = app.listen(3001, () => {
      resolve(s);
    });
  });
});

afterAll(() => {
  closeDb();
  server?.close();
});

describe('CRMBench API', () => {
  it('should return health status', async () => {
    const response = await fetch('http://localhost:3001/api/health');
    const data: any = await response.json();
    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
  });

  it('should create a client', async () => {
    const response = await fetch('http://localhost:3001/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Client',
        email: 'test@example.com',
        company: 'Test Company'
      })
    });

    expect(response.status).toBe(201);
    const data: any = await response.json();
    expect(data.name).toBe('Test Client');
    expect(data.email).toBe('test@example.com');
    expect(data.id).toBeDefined();
  });

  it('should create a deal related to a client', async () => {
    // First create a client
    const clientResponse = await fetch('http://localhost:3001/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Client 2',
        email: 'test2@example.com',
        company: null
      })
    });

    const client: any = await clientResponse.json();

    // Then create a deal
    const dealResponse = await fetch('http://localhost:3001/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Deal',
        valueInCents: 100000,
        clientId: client.id,
        stage: 'new'
      })
    });

    expect(dealResponse.status).toBe(201);
    const deal: any = await dealResponse.json();
    expect(deal.title).toBe('Test Deal');
    expect(deal.clientId).toBe(client.id);
    expect(deal.stage).toBe('new');
  });

  it('should persist stage change for a deal', async () => {
    // Create a client
    const clientResponse = await fetch('http://localhost:3001/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Client 3',
        email: 'test3@example.com'
      })
    });

    const client: any = await clientResponse.json();

    // Create a deal
    const dealResponse = await fetch('http://localhost:3001/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Stage Test Deal',
        valueInCents: 50000,
        clientId: client.id,
        stage: 'new'
      })
    });

    const deal: any = await dealResponse.json();
    expect(deal.stage).toBe('new');

    // Update stage
    const updateResponse = await fetch(`http://localhost:3001/api/deals/${deal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: 'proposal' })
    });

    const updatedDeal: any = await updateResponse.json();
    expect(updatedDeal.stage).toBe('proposal');

    // Verify persistence by fetching again
    const getResponse = await fetch(`http://localhost:3001/api/deals`);
    const deals: any = await getResponse.json();
    const persisted: any = deals.data.find((d: any) => d.id === deal.id);
    expect(persisted.stage).toBe('proposal');
  });
});

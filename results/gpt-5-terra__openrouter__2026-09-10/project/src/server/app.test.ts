import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './app.js';
import { createSchema, openDatabase } from './db.js';
import type Database from 'better-sqlite3';

describe('API do Mini CRM', () => {
  let directory = '';
  let server: Server;
  let baseUrl = '';
  let db: Database.Database;
  let dbPath = '';

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), 'crmbench-'));
    dbPath = join(directory, 'test.sqlite');
    db = openDatabase(dbPath);
    createSchema(db);
    server = createApp(db).listen(0);
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address();
    baseUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });

  async function request(path: string, options?: RequestInit) {
    return fetch(`${baseUrl}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  }

  it('responde ao health check', async () => {
    const response = await request('/api/health');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('cria um cliente normalizando espaços e protegendo e-mail duplicado', async () => {
    const created = await request('/api/clients', { method: 'POST', body: JSON.stringify({ name: '  Ana Lima ', email: ' ANA@EXAMPLE.COM ', company: '  Acme  ' }) });
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ name: 'Ana Lima', email: 'ANA@EXAMPLE.COM', company: 'Acme' });
    const duplicate = await request('/api/clients', { method: 'POST', body: JSON.stringify({ name: 'Outra Ana', email: 'ana@example.com' }) });
    expect(duplicate.status).toBe(409);
  });

  it('cria um negócio relacionado a um cliente existente', async () => {
    const client = await request('/api/clients', { method: 'POST', body: JSON.stringify({ name: 'Empresa Teste', email: 'teste@empresa.com' }) });
    const savedClient = await client.json();
    const deal = await request('/api/deals', { method: 'POST', body: JSON.stringify({ title: 'Projeto inicial', valueInCents: 12500, clientId: savedClient.id, stage: 'new' }) });
    expect(deal.status).toBe(201);
    expect(await deal.json()).toMatchObject({ title: 'Projeto inicial', valueInCents: 12500, clientId: savedClient.id, stage: 'new' });
  });

  it('persiste a mudança de etapa do negócio', async () => {
    const client = await request('/api/clients', { method: 'POST', body: JSON.stringify({ name: 'Conta Pipeline', email: 'pipeline@empresa.com' }) });
    const savedClient = await client.json();
    const deal = await request('/api/deals', { method: 'POST', body: JSON.stringify({ title: 'Oportunidade', valueInCents: 30000, clientId: savedClient.id, stage: 'new' }) });
    const savedDeal = await deal.json();
    const update = await request(`/api/deals/${savedDeal.id}`, { method: 'PATCH', body: JSON.stringify({ stage: 'won' }) });
    expect(update.status).toBe(200);
    expect(await update.json()).toMatchObject({ stage: 'won' });
    await new Promise<void>(resolve => server.close(() => resolve()));
    db.close();
    db = openDatabase(dbPath);
    server = createApp(db).listen(0);
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address();
    baseUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
    const list = await request(`/api/deals?stage=won&clientId=${savedClient.id}`);
    expect((await list.json()).data).toHaveLength(1);
  });
});

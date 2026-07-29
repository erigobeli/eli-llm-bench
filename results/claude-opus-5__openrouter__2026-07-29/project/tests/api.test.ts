import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app';
import { loadSeed, openDatabase, removeDatabaseFiles, type Db, type SeedFile } from '../src/server/db';

const seed = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'seed-data.json'), 'utf8'),
) as SeedFile;

let tempDir: string;
let dbPath: string;
let db: Db;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crmbench-test-'));
  dbPath = path.join(tempDir, 'test.sqlite');
  db = openDatabase(dbPath);
  loadSeed(db, seed);
  app = createApp(db);
});

afterAll(() => {
  try {
    db.close();
  } catch {
    // ignora
  }
  removeDatabaseFiles(dbPath);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('health', () => {
  it('GET /api/health responde 200 { status: "ok" }', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('GET /api/dashboard reflete o seed intacto', async () => {
    const response = await request(app).get('/api/dashboard');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      totalClients: 5,
      openDeals: 6,
      pipelineValueInCents: 1010000,
    });
  });
});

describe('clientes', () => {
  it('POST /api/clients cria cliente, normaliza espaços e rejeita e-mail duplicado', async () => {
    const created = await request(app)
      .post('/api/clients')
      .send({ name: '  Joana Ribeiro  ', email: '  joana@example.com ', company: '  Ribeiro ME  ' });

    expect(created.status).toBe(201);
    expect(created.body.id).toBeTypeOf('number');
    expect(created.body.name).toBe('Joana Ribeiro');
    expect(created.body.email).toBe('joana@example.com');
    expect(created.body.company).toBe('Ribeiro ME');

    const duplicated = await request(app)
      .post('/api/clients')
      .send({ name: 'Outra Joana', email: 'JOANA@EXAMPLE.COM' });
    expect(duplicated.status).toBe(409);
    expect(typeof duplicated.body.error).toBe('string');

    const invalid = await request(app).post('/api/clients').send({ name: 'A', email: 'x' });
    expect(invalid.status).toBe(400);

    const list = await request(app).get('/api/clients').query({ search: 'joana', pageSize: 4 });
    expect(list.status).toBe(200);
    expect(list.body.pagination.pageSize).toBe(4);
    expect(list.body.data.some((client: any) => client.id === created.body.id)).toBe(true);
  });
});

describe('negócios', () => {
  it('POST /api/deals cria negócio relacionado a um cliente existente', async () => {
    const client = await request(app)
      .post('/api/clients')
      .send({ name: 'Estúdio Vertex', email: 'contato@vertex.com.br', company: 'Vertex' });
    expect(client.status).toBe(201);

    const deal = await request(app).post('/api/deals').send({
      title: 'Implantação do CRM',
      valueInCents: 250000,
      clientId: client.body.id,
      stage: 'contact',
    });

    expect(deal.status).toBe(201);
    expect(deal.body.clientId).toBe(client.body.id);
    expect(deal.body.valueInCents).toBe(250000);
    expect(deal.body.stage).toBe('contact');

    const filtered = await request(app)
      .get('/api/deals')
      .query({ clientId: client.body.id, stage: 'contact' });
    expect(filtered.status).toBe(200);
    expect(filtered.body.pagination.total).toBe(1);
    expect(filtered.body.data[0].id).toBe(deal.body.id);

    const invalidClient = await request(app)
      .post('/api/deals')
      .send({ title: 'Negócio órfão', valueInCents: 100, clientId: 999999 });
    expect(invalidClient.status).toBe(400);

    const invalidStage = await request(app)
      .post('/api/deals')
      .send({ title: 'Etapa inválida', valueInCents: 100, clientId: client.body.id, stage: 'lost' });
    expect(invalidStage.status).toBe(400);

    const clientDeals = await request(app).get(`/api/clients/${client.body.id}/deals`);
    expect(clientDeals.status).toBe(200);
    expect(clientDeals.body.data).toHaveLength(1);

    const blockedDelete = await request(app).delete(`/api/clients/${client.body.id}`);
    expect(blockedDelete.status).toBe(409);
  });
});

describe('pipeline', () => {
  it('mudar a etapa persiste no SQLite após reabrir o banco', async () => {
    const client = await request(app)
      .post('/api/clients')
      .send({ name: 'Fábrica Norte', email: 'comercial@fabricanorte.com.br' });
    const deal = await request(app)
      .post('/api/deals')
      .send({ title: 'Modernização da linha', valueInCents: 420000, clientId: client.body.id });
    expect(deal.body.stage).toBe('new');

    const patched = await request(app).patch(`/api/deals/${deal.body.id}`).send({ stage: 'proposal' });
    expect(patched.status).toBe(200);
    expect(patched.body.stage).toBe('proposal');
    expect(patched.body.title).toBe('Modernização da linha');
    expect(patched.body.updatedAt > deal.body.updatedAt).toBe(true);

    // Encerra a conexão e reabre o arquivo para confirmar a persistência em disco.
    db.close();
    const reopened = openDatabase(dbPath);
    const stored = reopened.prepare('SELECT stage FROM deals WHERE id = ?').get(deal.body.id) as any;
    expect(stored.stage).toBe('proposal');
    reopened.close();

    db = openDatabase(dbPath);
    app = createApp(db);

    const afterRestart = await request(app).get(`/api/deals/${deal.body.id}`);
    expect(afterRestart.status).toBe(200);
    expect(afterRestart.body.stage).toBe('proposal');
  });
});

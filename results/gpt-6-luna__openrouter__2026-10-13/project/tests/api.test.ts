import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type Database from 'better-sqlite3';
import { createApp } from '../src/server/app.js';
import { createDatabase } from '../src/server/db.js';

describe('API do Mini CRM', () => {
  let db: Database.Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = createDatabase();
    app = createApp(db);
  });

  afterEach(() => db.close());

  it('responde ao health check', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('cria cliente normalizando espaços e impede e-mail duplicado sem diferenciar caixa', async () => {
    const created = await request(app).post('/api/clients').send({ name: '  Ana Lima  ', email: ' ana@example.com ', company: '  Acme  ' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: 'Ana Lima', email: 'ana@example.com', company: 'Acme' });
    expect(new Date(created.body.createdAt).toISOString()).toBe(created.body.createdAt);
    const conflict = await request(app).post('/api/clients').send({ name: 'Ana Lima', email: 'ANA@example.com' });
    expect(conflict.status).toBe(409);
  });

  it('cria negócio relacionado e permite combinar filtros e paginação', async () => {
    const client = await request(app).post('/api/clients').send({ name: 'Empresa Um', email: 'um@example.com' });
    const created = await request(app).post('/api/deals').send({ title: '  Implantação CRM  ', valueInCents: 23500, clientId: client.body.id, stage: 'proposal' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ title: 'Implantação CRM', valueInCents: 23500, clientId: client.body.id, stage: 'proposal' });
    const list = await request(app).get(`/api/deals?clientId=${client.body.id}&stage=proposal&page=1&pageSize=1`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.pagination).toMatchObject({ page: 1, pageSize: 1, total: 1, totalPages: 1 });
  });

  it('persiste a mudança de etapa do negócio no SQLite', async () => {
    const client = await request(app).post('/api/clients').send({ name: 'Empresa Dois', email: 'dois@example.com' });
    const created = await request(app).post('/api/deals').send({ title: 'Proposta anual', valueInCents: 100000, clientId: client.body.id, stage: 'new' });
    const updated = await request(app).patch(`/api/deals/${created.body.id}`).send({ stage: 'won' });
    expect(updated.status).toBe(200);
    expect(updated.body.stage).toBe('won');
    expect(db.prepare('SELECT stage FROM deals WHERE id = ?').get(created.body.id)).toEqual({ stage: 'won' });
    expect(Date.parse(updated.body.updatedAt)).toBeGreaterThanOrEqual(Date.parse(created.body.updatedAt));
  });
});

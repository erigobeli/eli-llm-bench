import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import type Database from 'better-sqlite3';
import { createApp } from './app.js';
import { createSchema, openDatabase } from './database.js';

describe('API do CRMBench Modelo', () => {
  let db: Database.Database;
  beforeEach(() => { db = openDatabase(':memory:'); createSchema(db); });
  afterEach(() => db.close());

  it('responde ao health check', async () => {
    const response = await request(createApp(db)).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('cria cliente com dados aparados, pesquisa e impede e-mail duplicado', async () => {
    const app = createApp(db);
    const created = await request(app).post('/api/clients').send({ name: '  Joana Lima  ', email: '  Joana@Example.com  ', company: '  Soluções  ' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: 'Joana Lima', email: 'Joana@Example.com', company: 'Soluções' });
    const found = await request(app).get('/api/clients?search=joana&pageSize=4');
    expect(found.body.pagination.total).toBe(1);
    expect(found.body.data[0].id).toBe(created.body.id);
    const duplicate = await request(app).post('/api/clients').send({ name: 'Outra pessoa', email: 'joana@example.com' });
    expect(duplicate.status).toBe(409);
  });

  it('cria negócio relacionado e atualiza indicadores e filtros', async () => {
    const app = createApp(db);
    const client = await request(app).post('/api/clients').send({ name: 'Teste Cliente', email: 'teste@example.com' });
    const created = await request(app).post('/api/deals').send({ title: 'Projeto piloto', valueInCents: 12500, clientId: client.body.id, stage: 'proposal' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ clientId: client.body.id, valueInCents: 12500, stage: 'proposal' });
    const filtered = await request(app).get(`/api/deals?stage=proposal&clientId=${client.body.id}&search=piloto`);
    expect(filtered.body.pagination.total).toBe(1);
    expect(filtered.body.data[0].id).toBe(created.body.id);
    expect((await request(app).get('/api/dashboard')).body).toEqual({ totalClients: 1, openDeals: 1, pipelineValueInCents: 12500 });
    expect((await request(app).delete(`/api/clients/${client.body.id}`)).status).toBe(409);
  });

  it('persiste a troca de etapa em disco após reabrir o banco', async () => {
    const path = resolve('.data', `test-pipeline-${process.pid}.sqlite`);
    rmSync(path, { force: true });
    let persisted: Database.Database | undefined;
    try {
      persisted = openDatabase(path); createSchema(persisted);
      let app = createApp(persisted);
      const client = await request(app).post('/api/clients').send({ name: 'Cliente Persistente', email: 'persistente@example.com' });
      const deal = await request(app).post('/api/deals').send({ title: 'Contrato anual', valueInCents: 20000, clientId: client.body.id, stage: 'new' });
      const changed = await request(app).patch(`/api/deals/${deal.body.id}`).send({ stage: 'won' });
      expect(changed.status).toBe(200);
      expect(changed.body.updatedAt).not.toBe(deal.body.updatedAt);
      persisted.close(); persisted = undefined;
      persisted = openDatabase(path); app = createApp(persisted);
      const afterRestart = await request(app).get('/api/deals?stage=won');
      expect(afterRestart.body.data[0].id).toBe(deal.body.id);
      expect((await request(app).get('/api/dashboard')).body).toEqual({ totalClients: 1, openDeals: 0, pipelineValueInCents: 0 });
    } finally { persisted?.close(); rmSync(path, { force: true }); }
  });

  it('rejeita valor, etapa e relacionamento inválidos sem inserir registros', async () => {
    const app = createApp(db);
    for (const change of [{ valueInCents: -1 }, { stage: 'lost' }, { clientId: 999 }]) {
      const response = await request(app).post('/api/deals').send({ title: 'Negócio teste', valueInCents: 100, clientId: 1, stage: 'new', ...change });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    }
    expect((await request(app).get('/api/deals')).body.pagination.total).toBe(0);
  });
});

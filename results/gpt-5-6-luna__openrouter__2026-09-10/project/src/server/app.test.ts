import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { closeDatabase, createDatabase, type Db } from './db.js';

describe('API do CRMBench Modelo', () => {
  let db: Db;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = createDatabase(':memory:');
    app = createApp(db);
  });
  afterEach(() => closeDatabase(db));

  it('responde ao health check', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('cria cliente com dados normalizados', async () => {
    const response = await request(app).post('/api/clients').send({ name: '  Ana Lima  ', email: 'ana@example.com', company: '  Acme  ' });
    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Ana Lima');
    expect(response.body.company).toBe('Acme');
    expect(response.body.id).toBe(1);
  });

  it('cria negócio relacionado a cliente existente', async () => {
    const client = await request(app).post('/api/clients').send({ name: 'Cliente Teste', email: 'cliente@example.com' });
    const response = await request(app).post('/api/deals').send({ title: 'Projeto novo', valueInCents: 25000, clientId: client.body.id, stage: 'new' });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ title: 'Projeto novo', valueInCents: 25000, clientId: client.body.id, stage: 'new' });
  });

  it('persiste a mudança de etapa do negócio', async () => {
    const client = await request(app).post('/api/clients').send({ name: 'Cliente Pipeline', email: 'pipeline@example.com' });
    const deal = await request(app).post('/api/deals').send({ title: 'Oportunidade', valueInCents: 100, clientId: client.body.id, stage: 'new' });
    const changed = await request(app).patch(`/api/deals/${deal.body.id}`).send({ stage: 'proposal' });
    expect(changed.status).toBe(200);
    const listed = await request(app).get('/api/deals?stage=proposal');
    expect(listed.body.data[0].stage).toBe('proposal');
  });
});

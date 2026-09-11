import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/app';
import { closeDb, getDb } from '../server/db';

const app = createApp();

async function createClient(overrides: Record<string, unknown> = {}) {
  const response = await request(app)
    .post('/api/clients')
    .send({
      name: 'Cliente de Teste',
      email: `cliente-${Date.now()}-${Math.random().toString(36).slice(2)}@teste.com`,
      company: 'Empresa Teste',
      ...overrides,
    });
  return response;
}

describe('CRMBench Modelo API', () => {
  afterAll(() => {
    closeDb();
  });

  it('responde ao health check', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('cria um cliente persistindo os campos tratados', async () => {
    const response = await createClient({
      name: '  Ana Prado  ',
      email: '  ANA.PRADO@Teste.com  ',
      company: '  Prado Ltda  ',
    });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Ana Prado');
    expect(response.body.email).toBe('ANA.PRADO@Teste.com');
    expect(response.body.company).toBe('Prado Ltda');
    expect(typeof response.body.id).toBe('number');
    expect(response.body.createdAt).toMatch(/T.*Z$/);
  });

  it('cria um negócio relacionado a um cliente existente', async () => {
    const client = await createClient({ name: 'Bruno Lima' });
    expect(client.status).toBe(201);

    const response = await request(app).post('/api/deals').send({
      title: 'Implantação de CRM',
      valueInCents: 250000,
      clientId: client.body.id,
      stage: 'new',
    });

    expect(response.status).toBe(201);
    expect(response.body.valueInCents).toBe(250000);
    expect(response.body.stage).toBe('new');
    expect(response.body.clientId).toBe(client.body.id);
  });

  it('persiste a mudança de etapa no SQLite', async () => {
    const client = await createClient({ name: 'Carla Souza' });
    const deal = await request(app).post('/api/deals').send({
      title: 'Mudança de etapa',
      valueInCents: 100000,
      clientId: client.body.id,
      stage: 'new',
    });

    const patched = await request(app)
      .patch(`/api/deals/${deal.body.id}`)
      .send({ stage: 'proposal' });
    expect(patched.status).toBe(200);
    expect(patched.body.stage).toBe('proposal');

    closeDb();
    const reloaded = await request(app).get(`/api/deals/${deal.body.id}`);
    expect(reloaded.status).toBe(200);
    expect(reloaded.body.stage).toBe('proposal');
  });

  it('recusa negócio inválido sem gravar dados', async () => {
    const before = (
      getDb().prepare('SELECT COUNT(*) AS c FROM deals').get() as { c: number }
    ).c;

    const response = await request(app).post('/api/deals').send({
      title: 'x',
      valueInCents: -5,
      clientId: 99999,
      stage: 'inexistente',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();

    const after = (
      getDb().prepare('SELECT COUNT(*) AS c FROM deals').get() as { c: number }
    ).c;
    expect(after).toBe(before);
  });

  it('bloqueia a exclusão de cliente com negócios (409)', async () => {
    const client = await createClient({ name: 'Diego Alves' });
    await request(app).post('/api/deals').send({
      title: 'Negócio vinculado',
      valueInCents: 5000,
      clientId: client.body.id,
      stage: 'contact',
    });

    const response = await request(app).delete(`/api/clients/${client.body.id}`);
    expect(response.status).toBe(409);
    expect(response.body.error).toBeTruthy();

    const stillThere = await request(app).get(`/api/clients/${client.body.id}`);
    expect(stillThere.status).toBe(200);
  });
});

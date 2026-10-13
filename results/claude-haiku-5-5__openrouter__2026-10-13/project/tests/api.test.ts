import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app.js';
import { openDatabase, seedDatabase, SEED_PATH, type Db, type SeedFile } from '../src/server/db.js';

let workdir: string;
let dbPath: string;
let db: Db;
let app: ReturnType<typeof createApp>;

function openTestDb(): Db {
  return openDatabase(dbPath);
}

beforeAll(() => {
  workdir = mkdtempSync(join(tmpdir(), 'crmbench-test-'));
  dbPath = join(workdir, 'test.sqlite');
  db = openTestDb();
  const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8')) as SeedFile;
  seedDatabase(db, seed);
  app = createApp(db);
});

afterAll(() => {
  db.close();
  rmSync(workdir, { recursive: true, force: true });
});

describe('API do CRM', () => {
  it('responde ao health check', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('cria cliente com dados normalizados e rejeita e-mail duplicado sem diferenciar caixa', async () => {
    const created = await request(app)
      .post('/api/clients')
      .send({ name: '  Ana Souza  ', email: '  Ana.Souza@Example.COM ', company: ' Souza Ltda ' });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      name: 'Ana Souza',
      email: 'ana.souza@example.com',
      company: 'Souza Ltda',
    });

    const duplicate = await request(app)
      .post('/api/clients')
      .send({ name: 'Outra Ana', email: 'ANA.SOUZA@example.com' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual({ error: expect.any(String) });
  });

  it('cria negócio relacionado a cliente existente e atualiza os indicadores', async () => {
    const before = await request(app).get('/api/dashboard');

    const created = await request(app).post('/api/deals').send({
      title: 'Contrato de manutenção',
      valueInCents: 150000,
      clientId: 1,
      stage: 'new',
    });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ title: 'Contrato de manutenção', clientId: 1, stage: 'new' });

    const after = await request(app).get('/api/dashboard');
    expect(after.body.openDeals).toBe(before.body.openDeals + 1);
    expect(after.body.pipelineValueInCents).toBe(before.body.pipelineValueInCents + 150000);

    const invalid = await request(app).post('/api/deals').send({
      title: 'Negócio sem cliente',
      valueInCents: 100,
      clientId: 9999,
    });
    expect(invalid.status).toBe(400);
  });

  it('persiste a mudança de etapa de um negócio após reabrir o banco', async () => {
    const created = await request(app).post('/api/deals').send({
      title: 'Negócio para avançar',
      valueInCents: 42000,
      clientId: 2,
    });
    const id = created.body.id as number;

    const updated = await request(app).patch(`/api/deals/${id}`).send({ stage: 'won' });
    expect(updated.status).toBe(200);
    expect(updated.body.stage).toBe('won');

    db.close();
    db = openTestDb();
    app = createApp(db);

    const listed = await request(app).get('/api/deals').query({ search: 'avançar', stage: 'won' });
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.data[0]).toMatchObject({ id, stage: 'won' });
  });

  it('impede excluir cliente com negócios relacionados', async () => {
    const response = await request(app).delete('/api/clients/1');
    expect(response.status).toBe(409);

    const stillThere = await request(app).get('/api/clients').query({ search: 'Nébula' });
    expect(stillThere.body.data).toHaveLength(1);
  });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type Database from 'better-sqlite3';
import { createApp } from './app.js';
import { openDatabase, setupDatabase } from './database.js';

let directory: string;
let databasePath: string;
let db: Database.Database;
let app: ReturnType<typeof createApp>;
beforeEach(() => {
  mkdirSync(resolve('.data'), { recursive: true });
  directory = mkdtempSync(resolve('.data/test-'));
  databasePath = join(directory, 'crm.sqlite');
  setupDatabase(databasePath);
  db = openDatabase(databasePath);
  app = createApp(db);
});
afterEach(() => { db.close(); rmSync(directory, { recursive: true, force: true }); });

describe('API e persistência do CRMBench Modelo', () => {
  it('health responde 200 e o JSON definido no contrato', async () => {
    const result = await request(app).get('/api/health');
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ status: 'ok' });
  });
  it('cria cliente, remove espaços e impede e-mail duplicado em outra caixa', async () => {
    const result = await request(app).post('/api/clients').send({ name: '  Ana Souza  ', email: '  ANA@EXAMPLE.COM  ', company: '  Empresa Azul  ' });
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({ name: 'Ana Souza', email: 'ana@example.com', company: 'Empresa Azul' });
    expect(result.body.createdAt).toMatch(/Z$/);
    const persisted = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.body.id);
    expect(persisted).toEqual(result.body);
    const duplicate = await request(app).post('/api/clients').send({ name: 'Outra Ana', email: 'Ana@Example.com' });
    expect(duplicate.status).toBe(409);
    expect(Object.keys(duplicate.body)).toEqual(['error']);
  });
  it('cria negócio relacionado e recalcula os indicadores do banco', async () => {
    const client = await request(app).post('/api/clients').send({ name: 'Novo contato', email: 'novo@example.com' });
    expect(client.body.company).toBeNull();
    const result = await request(app).post('/api/deals').send({ title: '  Contrato anual  ', valueInCents: 45000, clientId: client.body.id, stage: 'proposal' });
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({ title: 'Contrato anual', valueInCents: 45000, clientId: client.body.id, stage: 'proposal' });
    expect(db.prepare('SELECT * FROM deals WHERE id = ?').get(result.body.id)).toEqual(result.body);
    expect((await request(app).get('/api/dashboard')).body).toEqual({ totalClients: 6, openDeals: 7, pipelineValueInCents: 1055000 });
  });
  it('mudança de etapa permanece após fechar e reabrir o SQLite', async () => {
    const before = (await request(app).get('/api/deals')).body.data[0];
    const result = await request(app).patch(`/api/deals/${before.id}`).send({ stage: 'won' });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ title: before.title, valueInCents: before.valueInCents, clientId: before.clientId, stage: 'won' });
    expect(result.body.updatedAt > before.updatedAt).toBe(true);
    db.close();
    db = openDatabase(databasePath);
    app = createApp(db);
    const persisted = await request(app).get('/api/deals?stage=won&clientId=1');
    expect(persisted.body.data).toHaveLength(1);
    expect(persisted.body.data[0].stage).toBe('won');
    expect((await request(app).get('/api/dashboard')).body).toEqual({ totalClients: 5, openDeals: 5, pipelineValueInCents: 890000 });
  });
  it('busca Unicode, paginação e filtros combinados retornam metadados corretos', async () => {
    const page = await request(app).get('/api/clients?page=2&pageSize=4');
    expect(page.body.data).toHaveLength(1);
    expect(page.body.pagination).toEqual({ page: 2, pageSize: 4, total: 5, totalPages: 2 });
    const search = await request(app).get('/api/clients').query({ search: 'NÉBULA' });
    expect(search.body.data.map((row: { id: number }) => row.id)).toEqual([1]);
    const deals = await request(app).get('/api/deals').query({ search: 'MARCA', stage: 'proposal', clientId: 1, pageSize: 4 });
    expect(deals.body.data.map((row: { id: number }) => row.id)).toEqual([6]);
    expect(deals.body.pagination.total).toBe(1);
    expect((await request(app).get('/api/clients?pageSize=51')).status).toBe(400);
  });
  it('atualização parcial preserva campos; exclusão respeita integridade sem cascata', async () => {
    const initial = (await request(app).get('/api/clients')).body.data[0];
    const updated = await request(app).patch('/api/clients/1').send({ company: '  Nova empresa  ' });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ name: initial.name, email: initial.email, company: 'Nova empresa' });
    expect(updated.body.updatedAt > initial.updatedAt).toBe(true);
    expect((await request(app).delete('/api/clients/1')).status).toBe(409);
    expect((await request(app).get('/api/deals')).body.pagination.total).toBe(8);
    const free = await request(app).post('/api/clients').send({ name: 'Sem negócios', email: 'livre@example.com' });
    expect((await request(app).delete(`/api/clients/${free.body.id}`)).status).toBe(204);
    expect((await request(app).patch(`/api/clients/${free.body.id}`).send({ name: 'Removido' })).status).toBe(404);
  });
  it('rejeita dados inválidos sem gravar e remove somente o negócio solicitado', async () => {
    for (const patch of [{ title: 'x' }, { valueInCents: -1 }, { valueInCents: 1.5 }, { stage: 'invalid' }, { clientId: 999 }, { clientId: '1' }]) {
      const result = await request(app).post('/api/deals').send({ title: 'Novo negócio', valueInCents: 100, clientId: 1, stage: 'new', ...patch });
      expect(result.status).toBe(400);
      expect(Object.keys(result.body)).toEqual(['error']);
    }
    expect((await request(app).get('/api/deals')).body.pagination.total).toBe(8);
    expect((await request(app).delete('/api/deals/1')).status).toBe(204);
    expect((await request(app).get('/api/deals')).body.pagination.total).toBe(7);
    expect((await request(app).get('/api/dashboard')).body.pipelineValueInCents).toBe(890000);
    expect((await request(app).delete('/api/deals/1')).status).toBe(404);
  });
  it('setup é repetível e restaura exatamente os dados e indicadores do seed', async () => {
    db.close();
    setupDatabase(databasePath);
    setupDatabase(databasePath);
    db = openDatabase(databasePath);
    app = createApp(db);
    expect((await request(app).get('/api/dashboard')).body).toEqual({ totalClients: 5, openDeals: 6, pipelineValueInCents: 1010000 });
    expect((await request(app).get('/api/deals')).body.pagination.total).toBe(8);
  });
});

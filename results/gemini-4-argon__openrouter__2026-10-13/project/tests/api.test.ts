import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/server/app.js';
import { closeDb, resetAndSeedDatabase } from '../src/server/db/database.js';

const testDbPath = path.resolve(process.cwd(), '.data', 'vitest-crmbench.sqlite');

describe('CRMBench Modelo - Suíte de API e Persistência', () => {
  beforeEach(() => {
    resetAndSeedDatabase(testDbPath);
  });

  afterAll(() => {
    closeDb();
    for (const suffix of ['', '-wal', '-shm']) {
      const target = `${testDbPath}${suffix}`;
      if (fs.existsSync(target)) {
        try {
          fs.rmSync(target, { force: true });
        } catch {
          // ignore cleanup lock
        }
      }
    }
  });

  it('deve responder 200 { status: "ok" } no endpoint de health e calcular indicadores iniciais do seed', async () => {
    const app = createApp(testDbPath);

    const healthRes = await request(app).get('/api/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body).toEqual({ status: 'ok' });

    const dashRes = await request(app).get('/api/dashboard');
    expect(dashRes.status).toBe(200);
    expect(dashRes.body).toEqual({
      totalClients: 5,
      openDeals: 6,
      pipelineValueInCents: 1010000,
    });
  });

  it('deve criar um cliente válido, remover espaços externos, validar duplicidade de e-mail sem diferenciar maiúsculas e permitir exclusão apenas sem negócios', async () => {
    const app = createApp(testDbPath);

    const createRes = await request(app).post('/api/clients').send({
      name: '  Vértice Engenharia  ',
      email: '  contato@vertice.com.br  ',
      company: '  Vértice Engenharia S.A.  ',
    });

    expect(createRes.status).toBe(201);
    expect(createRes.body.id).toBeTypeOf('number');
    expect(createRes.body.name).toBe('Vértice Engenharia');
    expect(createRes.body.email).toBe('contato@vertice.com.br');
    expect(createRes.body.company).toBe('Vértice Engenharia S.A.');

    // Duplicidade case-insensitive deve retornar 409
    const dupRes = await request(app).post('/api/clients').send({
      name: 'Outro Cliente',
      email: 'CONTATO@VERTICE.COM.BR',
    });
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error).toBeTypeOf('string');

    // Cliente com negócios (id 1 do seed) não pode ser excluído (409)
    const delWithDeals = await request(app).delete('/api/clients/1');
    expect(delWithDeals.status).toBe(409);

    // Cliente recém-criado sem negócios pode ser excluído (204)
    const delClean = await request(app).delete(`/api/clients/${createRes.body.id}`);
    expect(delClean.status).toBe(204);
  });

  it('deve criar um negócio relacionado a um cliente existente, validar campos inválidos com 400 e atualizar os indicadores', async () => {
    const app = createApp(testDbPath);

    const clientRes = await request(app).post('/api/clients').send({
      name: 'Logística Atlântico',
      email: 'comercial@atlantico.com.br',
      company: null,
    });
    expect(clientRes.status).toBe(201);

    const dealRes = await request(app).post('/api/deals').send({
      title: '  Implantação de WMS  ',
      valueInCents: 250000,
      clientId: clientRes.body.id,
      stage: 'proposal',
    });

    expect(dealRes.status).toBe(201);
    expect(dealRes.body.title).toBe('Implantação de WMS');
    expect(dealRes.body.valueInCents).toBe(250000);
    expect(dealRes.body.clientId).toBe(clientRes.body.id);
    expect(dealRes.body.stage).toBe('proposal');

    // Validação inválida (cliente inexistente / valor negativo) -> 400
    const invalidRes = await request(app).post('/api/deals').send({
      title: 'Negócio inválido',
      valueInCents: -100,
      clientId: 9999,
      stage: 'new',
    });
    expect(invalidRes.status).toBe(400);

    // Indicadores atualizados
    const dashRes = await request(app).get('/api/dashboard');
    expect(dashRes.status).toBe(200);
    expect(dashRes.body).toEqual({
      totalClients: 6,
      openDeals: 7,
      pipelineValueInCents: 1260000,
    });
  });

  it('deve persistir a mudança de etapa do negócio no SQLite mesmo após fechar e reabrir a conexão do servidor', async () => {
    const app1 = createApp(testDbPath);

    // Negócio 1 começa em "new" com valor 120000
    const beforePatch = await request(app1).get('/api/deals?clientId=1');
    const deal1Before = beforePatch.body.data.find((d: { id: number }) => d.id === 1);
    expect(deal1Before.stage).toBe('new');

    const patchRes = await request(app1).patch('/api/deals/1').send({
      stage: 'won',
    });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.stage).toBe('won');
    expect(patchRes.body.updatedAt).not.toBe(deal1Before.updatedAt);

    // Simula encerramento e reinício do servidor fechando o banco e criando nova instância
    closeDb();
    const app2 = createApp(testDbPath);

    const afterRestart = await request(app2).get('/api/deals?stage=won');
    expect(afterRestart.status).toBe(200);
    const deal1After = afterRestart.body.data.find((d: { id: number }) => d.id === 1);
    expect(deal1After).toBeDefined();
    expect(deal1After.stage).toBe('won');

    // Como o negócio 1 (120000) foi para "won", negócios abertos caem de 6 para 5 e pipeline de 1010000 para 890000
    const dashRes = await request(app2).get('/api/dashboard');
    expect(dashRes.status).toBe(200);
    expect(dashRes.body).toEqual({
      totalClients: 5,
      openDeals: 5,
      pipelineValueInCents: 890000,
    });
  });
});

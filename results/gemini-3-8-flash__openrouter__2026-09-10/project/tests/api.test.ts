import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { createApp } from '../src/server/app.js';
import { initSchema } from '../src/server/db.js';

describe('CRMBench Modelo - API Tests', () => {
  let db: Database.Database;
  let app: any;
  const testDbPath = path.resolve(process.cwd(), '.data', 'test-bench.sqlite');

  beforeEach(() => {
    fs.mkdirSync(path.dirname(testDbPath), { recursive: true });
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {
        // ignore
      }
    }
    db = new Database(testDbPath);
    initSchema(db);
    app = createApp(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {
        // ignore
      }
    }
  });

  // 1. health
  it('health: GET /api/health deve responder 200 { status: "ok" }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  // 2. criação de cliente
  it('criação de cliente: POST /api/clients persiste cliente com dados válidos e trata duplicidade', async () => {
    const newClient = {
      name: '  Empresa Teste  ',
      email: '  TESTE@EMPRESA.COM  ',
      company: '  Empresa Teste LTDA  ',
    };

    const res = await request(app).post('/api/clients').send(newClient);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Empresa Teste');
    expect(res.body.email).toBe('TESTE@EMPRESA.COM');
    expect(res.body.company).toBe('Empresa Teste LTDA');
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.updatedAt).toBeDefined();

    // Check case-insensitive unique email conflict
    const dupRes = await request(app).post('/api/clients').send({
      name: 'Outra Empresa',
      email: 'teste@empresa.com',
    });
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error).toBeDefined();
  });

  // 3. criação de negócio relacionado
  it('criação de negócio relacionado: POST /api/deals valida cliente e persiste negócio', async () => {
    // Primeiro cria um cliente
    const clientRes = await request(app).post('/api/clients').send({
      name: 'Cliente Para Negócio',
      email: 'negocio@cliente.com',
    });
    expect(clientRes.status).toBe(201);
    const clientId = clientRes.body.id;

    // Tenta criar negócio para cliente inexistente (deve falhar 400)
    const invalidDeal = await request(app).post('/api/deals').send({
      title: 'Negócio Inválido',
      valueInCents: 50000,
      clientId: 99999,
      stage: 'new',
    });
    expect(invalidDeal.status).toBe(400);

    // Cria negócio associado válido
    const dealRes = await request(app).post('/api/deals').send({
      title: '  Contrato de Serviços  ',
      valueInCents: 150000,
      clientId,
      stage: 'new',
    });
    expect(dealRes.status).toBe(201);
    expect(dealRes.body.title).toBe('Contrato de Serviços');
    expect(dealRes.body.valueInCents).toBe(150000);
    expect(dealRes.body.clientId).toBe(clientId);
    expect(dealRes.body.stage).toBe('new');

    // Valida que cliente com negócio não pode ser excluído (409)
    const delClientRes = await request(app).delete(`/api/clients/${clientId}`);
    expect(delClientRes.status).toBe(409);
    expect(delClientRes.body.error).toBeDefined();
  });

  // 4. persistência da mudança de etapa
  it('persistência da mudança de etapa: PATCH /api/deals/:id atualiza etapa no banco SQLite', async () => {
    // Cria cliente e negócio
    const clientRes = await request(app).post('/api/clients').send({
      name: 'Cliente Etapa',
      email: 'etapa@cliente.com',
    });
    const clientId = clientRes.body.id;

    const dealRes = await request(app).post('/api/deals').send({
      title: 'Proposta Comercial',
      valueInCents: 200000,
      clientId,
      stage: 'new',
    });
    const dealId = dealRes.body.id;

    // Atualiza etapa para 'proposal'
    const patchRes = await request(app).patch(`/api/deals/${dealId}`).send({
      stage: 'proposal',
    });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.stage).toBe('proposal');

    // Fecha conexão do banco e reabre outro handle no mesmo arquivo para validar persistência física
    db.close();
    const reloadedDb = new Database(testDbPath);
    const row = reloadedDb.prepare('SELECT stage, updatedAt FROM deals WHERE id = ?').get(dealId) as { stage: string; updatedAt: string };
    expect(row.stage).toBe('proposal');
    reloadedDb.close();

    // Reabre para o afterEach não falhar
    db = new Database(testDbPath);
  });

  // 5. indicadores do dashboard
  it('indicadores: GET /api/dashboard reflete clientes e negócios abertos', async () => {
    // Insere cliente
    const client = await request(app).post('/api/clients').send({
      name: 'Cliente Dashboard',
      email: 'dash@cliente.com',
    });

    // Insere um negócio aberto e um ganho ('won')
    await request(app).post('/api/deals').send({
      title: 'Negócio Aberto',
      valueInCents: 100000,
      clientId: client.body.id,
      stage: 'contact',
    });

    await request(app).post('/api/deals').send({
      title: 'Negócio Fechado',
      valueInCents: 500000,
      clientId: client.body.id,
      stage: 'won',
    });

    const dashRes = await request(app).get('/api/dashboard');
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.totalClients).toBe(1);
    expect(dashRes.body.openDeals).toBe(1);
    expect(dashRes.body.pipelineValueInCents).toBe(100000);
  });

  // 6. paginação e busca
  it('paginação e busca: GET /api/clients respeita pageSize=4 e busca', async () => {
    // Insere 5 clientes
    for (let i = 1; i <= 5; i++) {
      await request(app).post('/api/clients').send({
        name: `Cliente Número ${i}`,
        email: `cliente${i}@teste.com`,
      });
    }

    const page1 = await request(app).get('/api/clients?pageSize=4&page=1');
    expect(page1.status).toBe(200);
    expect(page1.body.data.length).toBe(4);
    expect(page1.body.pagination.total).toBe(5);
    expect(page1.body.pagination.totalPages).toBe(2);

    const searchRes = await request(app).get('/api/clients?search=Número 3');
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.length).toBe(1);
    expect(searchRes.body.data[0].name).toBe('Cliente Número 3');
  });
});

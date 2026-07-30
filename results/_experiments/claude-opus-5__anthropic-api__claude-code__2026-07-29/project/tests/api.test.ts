import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { removeDatabaseFiles } from '../src/server/db';
import type { Client, Deal } from '../src/server/types';
import { api, startTestServer, testDbPath, type TestServer } from './helpers';

const DB_PATH = testDbPath('api');
let app: TestServer;

beforeAll(async () => {
  app = await startTestServer(DB_PATH, { seed: true });
});

afterAll(async () => {
  await app.close();
  removeDatabaseFiles(DB_PATH);
});

describe('saúde do serviço', () => {
  it('GET /api/health responde 200 com status ok', async () => {
    const response = await api<{ status: string }>(app.url, '/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('indicadores do seed', () => {
  it('reflete os números do seed imutável', async () => {
    const response = await api<{
      totalClients: number;
      openDeals: number;
      pipelineValueInCents: number;
    }>(app.url, '/api/dashboard');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      totalClients: 5,
      openDeals: 6,
      pipelineValueInCents: 1010000,
    });
  });
});

describe('criação de cliente', () => {
  it('persiste nome, e-mail e empresa sem espaços externos', async () => {
    const created = await api<Client>(app.url, '/api/clients', {
      method: 'POST',
      body: JSON.stringify({
        name: '  Joana Ribeiro  ',
        email: '  Joana@Exemplo.com.br ',
        company: '  Ribeiro Consultoria  ',
      }),
    });

    expect(created.status).toBe(201);
    expect(created.body.id).toBeGreaterThan(0);
    expect(created.body.name).toBe('Joana Ribeiro');
    expect(created.body.email).toBe('Joana@Exemplo.com.br');
    expect(created.body.company).toBe('Ribeiro Consultoria');

    const list = await api<{ data: Client[]; pagination: { total: number } }>(
      app.url,
      '/api/clients?search=joana',
    );
    expect(list.status).toBe(200);
    expect(list.body.pagination.total).toBe(1);
    expect(list.body.data[0].id).toBe(created.body.id);

    const duplicate = await api<{ error: string }>(app.url, '/api/clients', {
      method: 'POST',
      body: JSON.stringify({ name: 'Outra pessoa', email: 'JOANA@exemplo.com.br' }),
    });
    expect(duplicate.status).toBe(409);
    expect(typeof duplicate.body.error).toBe('string');
  });
});

describe('criação de negócio relacionado', () => {
  it('cria o negócio vinculado a um cliente existente e valida os dados', async () => {
    const client = await api<Client>(app.url, '/api/clients', {
      method: 'POST',
      body: JSON.stringify({ name: 'Studio Vega', email: 'contato@vega.com.br' }),
    });
    expect(client.status).toBe(201);

    const deal = await api<Deal>(app.url, '/api/deals', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Implantação do CRM',
        valueInCents: 250000,
        clientId: client.body.id,
        stage: 'contact',
      }),
    });

    expect(deal.status).toBe(201);
    expect(deal.body.clientId).toBe(client.body.id);
    expect(deal.body.valueInCents).toBe(250000);
    expect(deal.body.stage).toBe('contact');

    const filtered = await api<{ data: Deal[]; pagination: { total: number } }>(
      app.url,
      `/api/deals?clientId=${client.body.id}&stage=contact`,
    );
    expect(filtered.body.pagination.total).toBe(1);
    expect(filtered.body.data[0].id).toBe(deal.body.id);

    const invalidClient = await api<{ error: string }>(app.url, '/api/deals', {
      method: 'POST',
      body: JSON.stringify({ title: 'Negócio órfão', valueInCents: 1000, clientId: 99999 }),
    });
    expect(invalidClient.status).toBe(400);

    const invalidValue = await api<{ error: string }>(app.url, '/api/deals', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Valor inválido',
        valueInCents: -1,
        clientId: client.body.id,
      }),
    });
    expect(invalidValue.status).toBe(400);
  });
});

describe('regras de exclusão de cliente', () => {
  it('bloqueia exclusão com negócios e permite sem negócios', async () => {
    const withDeals = await api<{ data: Deal[] }>(app.url, '/api/deals?clientId=1');
    expect(withDeals.body.data.length).toBeGreaterThan(0);

    const blocked = await api<{ error: string }>(app.url, '/api/clients/1', { method: 'DELETE' });
    expect(blocked.status).toBe(409);

    const stillThere = await api<Client>(app.url, '/api/clients/1');
    expect(stillThere.status).toBe(200);

    const solo = await api<Client>(app.url, '/api/clients', {
      method: 'POST',
      body: JSON.stringify({ name: 'Cliente Temporário', email: 'temp@exemplo.com' }),
    });
    const removed = await api(app.url, `/api/clients/${solo.body.id}`, { method: 'DELETE' });
    expect(removed.status).toBe(204);

    const gone = await api(app.url, `/api/clients/${solo.body.id}`);
    expect(gone.status).toBe(404);
  });
});

describe('atualização parcial de cliente', () => {
  it('preserva campos ausentes e altera updatedAt', async () => {
    const created = await api<Client>(app.url, '/api/clients', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Paula Andrade',
        email: 'paula@exemplo.com',
        company: 'Andrade ME',
      }),
    });

    const updated = await api<Client>(app.url, `/api/clients/${created.body.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Paula Andrade Souza' }),
    });

    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('Paula Andrade Souza');
    expect(updated.body.email).toBe('paula@exemplo.com');
    expect(updated.body.company).toBe('Andrade ME');
    expect(updated.body.createdAt).toBe(created.body.createdAt);
    expect(updated.body.updatedAt).not.toBe(created.body.updatedAt);
  });
});

describe('paginação de clientes', () => {
  it('devolve metadados coerentes com pageSize=4', async () => {
    const first = await api<{ data: Client[]; pagination: Record<string, number> }>(
      app.url,
      '/api/clients?page=1&pageSize=4',
    );
    expect(first.status).toBe(200);
    expect(first.body.data).toHaveLength(4);
    expect(first.body.pagination.page).toBe(1);
    expect(first.body.pagination.pageSize).toBe(4);
    expect(first.body.pagination.totalPages).toBe(
      Math.ceil(first.body.pagination.total / 4),
    );

    const second = await api<{ data: Client[] }>(app.url, '/api/clients?page=2&pageSize=4');
    expect(second.status).toBe(200);
    const firstIds = first.body.data.map((client) => client.id);
    const secondIds = second.body.data.map((client) => client.id);
    expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);

    const invalid = await api(app.url, '/api/clients?pageSize=999');
    expect(invalid.status).toBe(400);
  });
});

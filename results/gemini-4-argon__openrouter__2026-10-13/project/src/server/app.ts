import express, { type Request, type Response, type NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { getDb } from './db/database.js';
import { VALID_STAGES, type Client, type Deal, type DealStage } from './types.js';

interface ClientRow {
  id: number;
  name: string;
  email: string;
  company: string | null;
  created_at: string;
  updated_at: string;
}

interface DealRow {
  id: number;
  title: string;
  value_in_cents: number;
  client_id: number;
  stage: DealStage;
  created_at: string;
  updated_at: string;
}

function mapClientRow(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDealRow(row: DealRow): Deal {
  return {
    id: row.id,
    title: row.title,
    valueInCents: row.value_in_cents,
    clientId: row.client_id,
    stage: row.stage,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getNextTimestamp(previousIso?: string): string {
  const now = Date.now();
  if (previousIso) {
    const prevMs = Date.parse(previousIso);
    if (!Number.isNaN(prevMs) && now <= prevMs) {
      return new Date(prevMs + 1).toISOString();
    }
  }
  return new Date(now).toISOString();
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  if (email.length < 3 || email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

function parsePositiveInt(val: unknown): number | null {
  if (typeof val === 'number') {
    return Number.isInteger(val) && val >= 1 ? val : null;
  }
  if (typeof val === 'string' && /^\d+$/.test(val.trim())) {
    const parsed = Number.parseInt(val.trim(), 10);
    return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
  }
  return null;
}

function parsePagination(query: Request['query']): { page: number; pageSize: number } | { error: string } {
  let page = 1;
  let pageSize = 10;

  if (query.page !== undefined && query.page !== '') {
    const parsedPage = parsePositiveInt(query.page);
    if (parsedPage === null) {
      return { error: 'O parâmetro page deve ser um inteiro maior ou igual a 1.' };
    }
    page = parsedPage;
  }

  if (query.pageSize !== undefined && query.pageSize !== '') {
    const parsedPageSize = parsePositiveInt(query.pageSize);
    if (parsedPageSize === null || parsedPageSize < 1 || parsedPageSize > 50) {
      return { error: 'O parâmetro pageSize deve ser um inteiro entre 1 e 50.' };
    }
    pageSize = parsedPageSize;
  }

  return { page, pageSize };
}

export function createApp(customDbPath?: string) {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/api/dashboard', (_req: Request, res: Response) => {
    const db = getDb(customDbPath);
    const clientCount = db.prepare('SELECT COUNT(*) as totalClients FROM clients').get() as {
      totalClients: number;
    };
    const dealStats = db
      .prepare(
        `SELECT COUNT(*) as openDeals, COALESCE(SUM(value_in_cents), 0) as pipelineValueInCents
         FROM deals
         WHERE stage != 'won'`
      )
      .get() as { openDeals: number; pipelineValueInCents: number };

    res.status(200).json({
      totalClients: Number(clientCount.totalClients),
      openDeals: Number(dealStats.openDeals),
      pipelineValueInCents: Number(dealStats.pipelineValueInCents),
    });
  });

  // Clients API
  app.get('/api/clients', (req: Request, res: Response) => {
    const pagination = parsePagination(req.query);
    if ('error' in pagination) {
      res.status(400).json({ error: pagination.error });
      return;
    }

    const { page, pageSize } = pagination;
    const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const db = getDb(customDbPath);

    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (rawSearch.length > 0) {
      conditions.push(
        `(ulower(name) LIKE @search OR ulower(email) LIKE @search OR ulower(COALESCE(company, '')) LIKE @search)`
      );
      params.search = `%${rawSearch.toLowerCase()}%`;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db
      .prepare(`SELECT COUNT(*) as total FROM clients ${whereClause}`)
      .get(params) as { total: number };
    const total = Number(countRow.total);
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;

    const rows = db
      .prepare(
        `SELECT id, name, email, company, created_at, updated_at
         FROM clients
         ${whereClause}
         ORDER BY created_at DESC, id DESC
         LIMIT @limit OFFSET @offset`
      )
      .all({ ...params, limit: pageSize, offset }) as ClientRow[];

    res.status(200).json({
      data: rows.map(mapClientRow),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  });

  app.post('/api/clients', (req: Request, res: Response) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'Dados inválidos para criação de cliente.' });
      return;
    }

    if (typeof body.name !== 'string') {
      res.status(400).json({ error: 'O nome do cliente é obrigatório.' });
      return;
    }
    const name = body.name.trim();
    if (name.length < 2 || name.length > 80) {
      res.status(400).json({ error: 'O nome do cliente deve ter entre 2 e 80 caracteres.' });
      return;
    }

    if (typeof body.email !== 'string') {
      res.status(400).json({ error: 'O e-mail do cliente é obrigatório.' });
      return;
    }
    const email = body.email.trim();
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Informe um endereço de e-mail válido.' });
      return;
    }

    let company: string | null = null;
    if (body.company !== undefined && body.company !== null) {
      if (typeof body.company !== 'string') {
        res.status(400).json({ error: 'O campo empresa deve ser um texto válido.' });
        return;
      }
      const trimmedCompany = body.company.trim();
      company = trimmedCompany.length > 0 ? trimmedCompany : null;
    }

    const db = getDb(customDbPath);
    const existingEmail = db
      .prepare('SELECT id FROM clients WHERE ulower(email) = ulower(?)')
      .get(email) as { id: number } | undefined;

    if (existingEmail) {
      res.status(409).json({ error: 'Já existe um cliente cadastrado com este e-mail.' });
      return;
    }

    const now = getNextTimestamp();
    const result = db
      .prepare(
        `INSERT INTO clients (name, email, company, created_at, updated_at)
         VALUES (@name, @email, @company, @createdAt, @updatedAt)`
      )
      .run({
        name,
        email,
        company,
        createdAt: now,
        updatedAt: now,
      });

    const created = db
      .prepare('SELECT id, name, email, company, created_at, updated_at FROM clients WHERE id = ?')
      .get(result.lastInsertRowid) as ClientRow;

    res.status(201).json(mapClientRow(created));
  });

  app.patch('/api/clients/:id', (req: Request, res: Response) => {
    const id = parsePositiveInt(req.params.id);
    if (id === null) {
      res.status(404).json({ error: 'Cliente não encontrado.' });
      return;
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'Dados de atualização inválidos.' });
      return;
    }

    const db = getDb(customDbPath);
    const existing = db
      .prepare('SELECT id, name, email, company, created_at, updated_at FROM clients WHERE id = ?')
      .get(id) as ClientRow | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Cliente não encontrado.' });
      return;
    }

    let name = existing.name;
    if ('name' in body && body.name !== undefined) {
      if (typeof body.name !== 'string') {
        res.status(400).json({ error: 'O nome do cliente deve ser um texto válido.' });
        return;
      }
      const trimmedName = body.name.trim();
      if (trimmedName.length < 2 || trimmedName.length > 80) {
        res.status(400).json({ error: 'O nome do cliente deve ter entre 2 e 80 caracteres.' });
        return;
      }
      name = trimmedName;
    }

    let email = existing.email;
    if ('email' in body && body.email !== undefined) {
      if (typeof body.email !== 'string') {
        res.status(400).json({ error: 'O e-mail do cliente deve ser um texto válido.' });
        return;
      }
      const trimmedEmail = body.email.trim();
      if (!isValidEmail(trimmedEmail)) {
        res.status(400).json({ error: 'Informe um endereço de e-mail válido.' });
        return;
      }
      const duplicate = db
        .prepare('SELECT id FROM clients WHERE ulower(email) = ulower(?) AND id != ?')
        .get(trimmedEmail, id) as { id: number } | undefined;
      if (duplicate) {
        res.status(409).json({ error: 'Já existe outro cliente cadastrado com este e-mail.' });
        return;
      }
      email = trimmedEmail;
    }

    let company = existing.company;
    if ('company' in body && body.company !== undefined) {
      if (body.company === null) {
        company = null;
      } else if (typeof body.company === 'string') {
        const trimmedCompany = body.company.trim();
        company = trimmedCompany.length > 0 ? trimmedCompany : null;
      } else {
        res.status(400).json({ error: 'O campo empresa deve ser um texto válido ou nulo.' });
        return;
      }
    }

    const updatedAt = getNextTimestamp(existing.updated_at);
    db.prepare(
      `UPDATE clients
       SET name = @name, email = @email, company = @company, updated_at = @updatedAt
       WHERE id = @id`
    ).run({
      id,
      name,
      email,
      company,
      updatedAt,
    });

    const updated = db
      .prepare('SELECT id, name, email, company, created_at, updated_at FROM clients WHERE id = ?')
      .get(id) as ClientRow;

    res.status(200).json(mapClientRow(updated));
  });

  app.delete('/api/clients/:id', (req: Request, res: Response) => {
    const id = parsePositiveInt(req.params.id);
    if (id === null) {
      res.status(404).json({ error: 'Cliente não encontrado.' });
      return;
    }

    const db = getDb(customDbPath);
    const existing = db.prepare('SELECT id FROM clients WHERE id = ?').get(id) as { id: number } | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Cliente não encontrado.' });
      return;
    }

    const relatedDeals = db
      .prepare('SELECT COUNT(*) as count FROM deals WHERE client_id = ?')
      .get(id) as { count: number };

    if (Number(relatedDeals.count) > 0) {
      res.status(409).json({
        error: 'Não é possível excluir um cliente que possui negócios relacionados.',
      });
      return;
    }

    db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    res.status(204).end();
  });

  // Deals API
  app.get('/api/deals', (req: Request, res: Response) => {
    const pagination = parsePagination(req.query);
    if ('error' in pagination) {
      res.status(400).json({ error: pagination.error });
      return;
    }

    const { page, pageSize } = pagination;
    const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const rawStage = typeof req.query.stage === 'string' ? req.query.stage.trim() : '';
    const rawClientId = req.query.clientId !== undefined ? String(req.query.clientId).trim() : '';

    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (rawSearch.length > 0) {
      conditions.push(`ulower(title) LIKE @search`);
      params.search = `%${rawSearch.toLowerCase()}%`;
    }

    if (rawStage.length > 0) {
      if (!VALID_STAGES.includes(rawStage as DealStage)) {
        res.status(400).json({ error: 'Etapa de filtro inválida.' });
        return;
      }
      conditions.push(`stage = @stage`);
      params.stage = rawStage;
    }

    if (rawClientId.length > 0) {
      const parsedClientId = parsePositiveInt(rawClientId);
      if (parsedClientId === null) {
        res.status(400).json({ error: 'Filtro de cliente inválido.' });
        return;
      }
      conditions.push(`client_id = @clientId`);
      params.clientId = parsedClientId;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const db = getDb(customDbPath);

    const countRow = db
      .prepare(`SELECT COUNT(*) as total FROM deals ${whereClause}`)
      .get(params) as { total: number };
    const total = Number(countRow.total);
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;

    const rows = db
      .prepare(
        `SELECT id, title, value_in_cents, client_id, stage, created_at, updated_at
         FROM deals
         ${whereClause}
         ORDER BY created_at DESC, id DESC
         LIMIT @limit OFFSET @offset`
      )
      .all({ ...params, limit: pageSize, offset }) as DealRow[];

    res.status(200).json({
      data: rows.map(mapDealRow),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  });

  app.post('/api/deals', (req: Request, res: Response) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'Dados inválidos para criação de negócio.' });
      return;
    }

    if (typeof body.title !== 'string') {
      res.status(400).json({ error: 'O título do negócio é obrigatório.' });
      return;
    }
    const title = body.title.trim();
    if (title.length < 2 || title.length > 120) {
      res.status(400).json({ error: 'O título do negócio deve ter entre 2 e 120 caracteres.' });
      return;
    }

    if (
      typeof body.valueInCents !== 'number' ||
      !Number.isInteger(body.valueInCents) ||
      body.valueInCents < 0
    ) {
      res.status(400).json({
        error: 'O valor do negócio deve ser um número inteiro em centavos maior ou igual a zero.',
      });
      return;
    }
    const valueInCents = body.valueInCents;

    if (typeof body.stage !== 'string' || !VALID_STAGES.includes(body.stage as DealStage)) {
      res.status(400).json({ error: 'A etapa informada para o negócio é inválida.' });
      return;
    }
    const stage = body.stage as DealStage;

    if (typeof body.clientId !== 'number' || !Number.isInteger(body.clientId) || body.clientId < 1) {
      res.status(400).json({ error: 'O cliente selecionado é inválido.' });
      return;
    }
    const clientId = body.clientId;

    const db = getDb(customDbPath);
    const clientExists = db.prepare('SELECT id FROM clients WHERE id = ?').get(clientId) as
      | { id: number }
      | undefined;

    if (!clientExists) {
      res.status(400).json({ error: 'O cliente informado não existe.' });
      return;
    }

    const now = getNextTimestamp();
    const result = db
      .prepare(
        `INSERT INTO deals (title, value_in_cents, client_id, stage, created_at, updated_at)
         VALUES (@title, @valueInCents, @clientId, @stage, @createdAt, @updatedAt)`
      )
      .run({
        title,
        valueInCents,
        clientId,
        stage,
        createdAt: now,
        updatedAt: now,
      });

    const created = db
      .prepare(
        'SELECT id, title, value_in_cents, client_id, stage, created_at, updated_at FROM deals WHERE id = ?'
      )
      .get(result.lastInsertRowid) as DealRow;

    res.status(201).json(mapDealRow(created));
  });

  app.patch('/api/deals/:id', (req: Request, res: Response) => {
    const id = parsePositiveInt(req.params.id);
    if (id === null) {
      res.status(404).json({ error: 'Negócio não encontrado.' });
      return;
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'Dados de atualização inválidos.' });
      return;
    }

    const db = getDb(customDbPath);
    const existing = db
      .prepare(
        'SELECT id, title, value_in_cents, client_id, stage, created_at, updated_at FROM deals WHERE id = ?'
      )
      .get(id) as DealRow | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Negócio não encontrado.' });
      return;
    }

    let title = existing.title;
    if ('title' in body && body.title !== undefined) {
      if (typeof body.title !== 'string') {
        res.status(400).json({ error: 'O título do negócio deve ser um texto válido.' });
        return;
      }
      const trimmedTitle = body.title.trim();
      if (trimmedTitle.length < 2 || trimmedTitle.length > 120) {
        res.status(400).json({ error: 'O título do negócio deve ter entre 2 e 120 caracteres.' });
        return;
      }
      title = trimmedTitle;
    }

    let valueInCents = existing.value_in_cents;
    if ('valueInCents' in body && body.valueInCents !== undefined) {
      if (
        typeof body.valueInCents !== 'number' ||
        !Number.isInteger(body.valueInCents) ||
        body.valueInCents < 0
      ) {
        res.status(400).json({
          error: 'O valor do negócio deve ser um número inteiro em centavos maior ou igual a zero.',
        });
        return;
      }
      valueInCents = body.valueInCents;
    }

    let stage = existing.stage;
    if ('stage' in body && body.stage !== undefined) {
      if (typeof body.stage !== 'string' || !VALID_STAGES.includes(body.stage as DealStage)) {
        res.status(400).json({ error: 'A etapa informada para o negócio é inválida.' });
        return;
      }
      stage = body.stage as DealStage;
    }

    let clientId = existing.client_id;
    if ('clientId' in body && body.clientId !== undefined) {
      if (typeof body.clientId !== 'number' || !Number.isInteger(body.clientId) || body.clientId < 1) {
        res.status(400).json({ error: 'O cliente selecionado é inválido.' });
        return;
      }
      const clientExists = db.prepare('SELECT id FROM clients WHERE id = ?').get(body.clientId) as
        | { id: number }
        | undefined;
      if (!clientExists) {
        res.status(400).json({ error: 'O cliente informado não existe.' });
        return;
      }
      clientId = body.clientId;
    }

    const updatedAt = getNextTimestamp(existing.updated_at);
    db.prepare(
      `UPDATE deals
       SET title = @title,
           value_in_cents = @valueInCents,
           client_id = @clientId,
           stage = @stage,
           updated_at = @updatedAt
       WHERE id = @id`
    ).run({
      id,
      title,
      valueInCents,
      clientId,
      stage,
      updatedAt,
    });

    const updated = db
      .prepare(
        'SELECT id, title, value_in_cents, client_id, stage, created_at, updated_at FROM deals WHERE id = ?'
      )
      .get(id) as DealRow;

    res.status(200).json(mapDealRow(updated));
  });

  app.delete('/api/deals/:id', (req: Request, res: Response) => {
    const id = parsePositiveInt(req.params.id);
    if (id === null) {
      res.status(404).json({ error: 'Negócio não encontrado.' });
      return;
    }

    const db = getDb(customDbPath);
    const existing = db.prepare('SELECT id FROM deals WHERE id = ?').get(id) as { id: number } | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Negócio não encontrado.' });
      return;
    }

    db.prepare('DELETE FROM deals WHERE id = ?').run(id);
    res.status(204).end();
  });

  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Rota da API não encontrada.' });
  });

  // Static production frontend serving
  const clientDistPath = path.resolve(process.cwd(), 'dist', 'client');
  const indexHtmlPath = path.join(clientDistPath, 'index.html');

  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
  }

  app.get('*', (_req: Request, res: Response) => {
    if (fs.existsSync(indexHtmlPath)) {
      res.sendFile(indexHtmlPath);
    } else {
      res.status(200).send('<!doctype html><html lang="pt-BR"><head><title>CRMBench Modelo</title></head><body><h1>CRMBench Modelo</h1></body></html>');
    }
  });

  // Error handler for malformed JSON or unexpected errors
  app.use((err: Error & { status?: number; type?: string }, _req: Request, res: Response, _next: NextFunction) => {
    if (err.type === 'entity.parse.failed' || err.status === 400) {
      res.status(400).json({ error: 'Corpo da requisição em formato JSON inválido.' });
      return;
    }
    res.status(500).json({ error: 'Erro interno no servidor.' });
  });

  return app;
}

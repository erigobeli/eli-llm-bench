import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import type Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Client, Deal, Stage } from './db.js';
import { timestampAfter } from './db.js';

const stages: Stage[] = ['new', 'contact', 'proposal', 'won'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(status: number, message: string): never {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  throw error;
}

function recordId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) fail(400, 'Identificador inválido.');
  return id;
}

function bodyObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'Envie um objeto JSON válido.');
  return value as Record<string, unknown>;
}

function validateName(value: unknown, max: number, label: string): string {
  if (typeof value !== 'string') fail(400, `${label} é obrigatório.`);
  const clean = value.trim();
  if (clean.length < 2 || clean.length > max) fail(400, `${label} deve ter entre 2 e ${max} caracteres.`);
  return clean;
}

function pagination(req: Request): { page: number; pageSize: number } {
  const pageValue = req.query.page === undefined ? 1 : Number(req.query.page);
  const sizeValue = req.query.pageSize === undefined ? 10 : Number(req.query.pageSize);
  if (!Number.isInteger(pageValue) || pageValue < 1) fail(400, 'Página inválida.');
  if (!Number.isInteger(sizeValue) || sizeValue < 1 || sizeValue > 50) fail(400, 'Tamanho da página deve estar entre 1 e 50.');
  return { page: pageValue, pageSize: sizeValue };
}

function paged<T>(data: T[], total: number, page: number, pageSize: number) {
  return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

export function createApp(db: Database.Database) {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.get('/api/clients', (req, res) => {
    const { page, pageSize } = pagination(req);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const pattern = `%${search}%`;
    const where = search ? 'WHERE name LIKE ? COLLATE NOCASE OR email LIKE ? COLLATE NOCASE OR company LIKE ? COLLATE NOCASE' : '';
    const params = search ? [pattern, pattern, pattern] : [];
    const total = (db.prepare(`SELECT COUNT(*) AS count FROM clients ${where}`).get(...params) as { count: number }).count;
    const data = db.prepare(`SELECT id, name, email, company, createdAt, updatedAt FROM clients ${where} ORDER BY id LIMIT ? OFFSET ?`)
      .all(...params, pageSize, (page - 1) * pageSize) as Client[];
    res.json(paged(data, total, page, pageSize));
  });

  app.post('/api/clients', (req, res) => {
    const body = bodyObject(req.body);
    const name = validateName(body.name, 80, 'Nome');
    if (typeof body.email !== 'string') fail(400, 'E-mail é obrigatório.');
    const email = body.email.trim();
    if (!emailPattern.test(email)) fail(400, 'Informe um e-mail válido.');
    const company = body.company == null || body.company === '' ? null : typeof body.company === 'string' ? body.company.trim() || null : fail(400, 'Empresa inválida.');
    const now = new Date().toISOString();
    const result = db.prepare('INSERT INTO clients (name, email, company, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)').run(name, email, company, now, now);
    res.status(201).json(db.prepare('SELECT id, name, email, company, createdAt, updatedAt FROM clients WHERE id = ?').get(result.lastInsertRowid));
  });

  app.patch('/api/clients/:id', (req, res) => {
    const id = recordId(req.params.id);
    const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as Client | undefined;
    if (!existing) fail(404, 'Cliente não encontrado.');
    const body = bodyObject(req.body);
    const name = body.name === undefined ? existing.name : validateName(body.name, 80, 'Nome');
    let email = existing.email;
    if (body.email !== undefined) {
      if (typeof body.email !== 'string') fail(400, 'Informe um e-mail válido.');
      email = body.email.trim();
      if (!emailPattern.test(email)) fail(400, 'Informe um e-mail válido.');
    }
    let company = existing.company;
    if (body.company !== undefined) {
      if (body.company === null || body.company === '') company = null;
      else if (typeof body.company === 'string') company = body.company.trim() || null;
      else fail(400, 'Empresa inválida.');
    }
    db.prepare('UPDATE clients SET name = ?, email = ?, company = ?, updatedAt = ? WHERE id = ?').run(name, email, company, timestampAfter(existing.updatedAt), id);
    res.json(db.prepare('SELECT id, name, email, company, createdAt, updatedAt FROM clients WHERE id = ?').get(id));
  });

  app.delete('/api/clients/:id', (req, res) => {
    const id = recordId(req.params.id);
    if (!(db.prepare('SELECT id FROM clients WHERE id = ?').get(id))) fail(404, 'Cliente não encontrado.');
    const related = db.prepare('SELECT 1 FROM deals WHERE clientId = ? LIMIT 1').get(id);
    if (related) fail(409, 'Não é possível excluir um cliente com negócios relacionados.');
    db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    res.status(204).end();
  });

  app.get('/api/deals', (req, res) => {
    const { page, pageSize } = pagination(req);
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    if (typeof req.query.search === 'string' && req.query.search.trim()) {
      conditions.push('title LIKE ? COLLATE NOCASE');
      params.push(`%${req.query.search.trim()}%`);
    }
    if (req.query.stage !== undefined) {
      if (typeof req.query.stage !== 'string' || !stages.includes(req.query.stage as Stage)) fail(400, 'Etapa inválida.');
      conditions.push('stage = ?');
      params.push(req.query.stage);
    }
    if (req.query.clientId !== undefined) {
      const clientId = Number(req.query.clientId);
      if (!Number.isInteger(clientId) || clientId < 1) fail(400, 'Cliente inválido.');
      conditions.push('clientId = ?');
      params.push(clientId);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = (db.prepare(`SELECT COUNT(*) AS count FROM deals ${where}`).get(...params) as { count: number }).count;
    const data = db.prepare(`SELECT id, title, valueInCents, clientId, stage, createdAt, updatedAt FROM deals ${where} ORDER BY id LIMIT ? OFFSET ?`)
      .all(...params, pageSize, (page - 1) * pageSize) as Deal[];
    res.json(paged(data, total, page, pageSize));
  });

  app.post('/api/deals', (req, res) => {
    const body = bodyObject(req.body);
    const title = validateName(body.title, 120, 'Título');
    if (!Number.isSafeInteger(body.valueInCents) || Number(body.valueInCents) < 0) fail(400, 'O valor deve ser um número inteiro maior ou igual a zero (em centavos).');
    if (!Number.isInteger(body.clientId) || Number(body.clientId) < 1) fail(400, 'Selecione um cliente válido.');
    if (!db.prepare('SELECT id FROM clients WHERE id = ?').get(body.clientId as number)) fail(400, 'O cliente selecionado não existe.');
    if (typeof body.stage !== 'string' || !stages.includes(body.stage as Stage)) fail(400, 'Etapa inválida.');
    const now = new Date().toISOString();
    const result = db.prepare('INSERT INTO deals (title, valueInCents, clientId, stage, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)')
      .run(title, body.valueInCents as number, body.clientId as number, body.stage, now, now);
    res.status(201).json(db.prepare('SELECT id, title, valueInCents, clientId, stage, createdAt, updatedAt FROM deals WHERE id = ?').get(result.lastInsertRowid));
  });

  app.patch('/api/deals/:id', (req, res) => {
    const id = recordId(req.params.id);
    const existing = db.prepare('SELECT * FROM deals WHERE id = ?').get(id) as Deal | undefined;
    if (!existing) fail(404, 'Negócio não encontrado.');
    const body = bodyObject(req.body);
    const title = body.title === undefined ? existing.title : validateName(body.title, 120, 'Título');
    const value = body.valueInCents === undefined ? existing.valueInCents : body.valueInCents;
    if (!Number.isSafeInteger(value) || Number(value) < 0) fail(400, 'O valor deve ser um número inteiro maior ou igual a zero (em centavos).');
    const clientId = body.clientId === undefined ? existing.clientId : body.clientId;
    if (!Number.isInteger(clientId) || Number(clientId) < 1) fail(400, 'Selecione um cliente válido.');
    if (!db.prepare('SELECT id FROM clients WHERE id = ?').get(clientId as number)) fail(400, 'O cliente selecionado não existe.');
    const stage = body.stage === undefined ? existing.stage : body.stage;
    if (typeof stage !== 'string' || !stages.includes(stage as Stage)) fail(400, 'Etapa inválida.');
    db.prepare('UPDATE deals SET title = ?, valueInCents = ?, clientId = ?, stage = ?, updatedAt = ? WHERE id = ?')
      .run(title, value as number, clientId as number, stage, timestampAfter(existing.updatedAt), id);
    res.json(db.prepare('SELECT id, title, valueInCents, clientId, stage, createdAt, updatedAt FROM deals WHERE id = ?').get(id));
  });

  app.delete('/api/deals/:id', (req, res) => {
    const id = recordId(req.params.id);
    if (!db.prepare('SELECT id FROM deals WHERE id = ?').get(id)) fail(404, 'Negócio não encontrado.');
    db.prepare('DELETE FROM deals WHERE id = ?').run(id);
    res.status(204).end();
  });

  app.get('/api/dashboard', (_req, res) => {
    const totalClients = (db.prepare('SELECT COUNT(*) AS count FROM clients').get() as { count: number }).count;
    const metrics = db.prepare("SELECT COUNT(*) AS openDeals, COALESCE(SUM(valueInCents), 0) AS pipelineValueInCents FROM deals WHERE stage != 'won'").get() as { openDeals: number; pipelineValueInCents: number };
    res.json({ totalClients, ...metrics });
  });

  const errors: ErrorRequestHandler = (error: Error & { status?: number; code?: string }, _req: Request, res: Response, _next) => {
    if (res.headersSent) return;
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(409).json({ error: 'Já existe um cliente com este e-mail.' });
      return;
    }
    const status = error.status ?? (error instanceof SyntaxError ? 400 : 500);
    res.status(status).json({ error: status === 500 ? 'Erro interno do servidor.' : error.message });
  };
  app.use(errors);

  const clientBuild = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist');
  app.use(express.static(clientBuild));
  app.get('*path', (_req, res) => res.sendFile(path.join(clientBuild, 'index.html')));
  return app;
}

import express, { type NextFunction, type Request, type Response } from 'express';
import type { Db } from './db.js';
import type { Stage } from './types.js';

const stages: Stage[] = ['new', 'contact', 'proposal', 'won'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const bad = (message: string): Error & { status?: number } => Object.assign(new Error(message), { status: 400 });
const notFound = (message: string): Error & { status?: number } => Object.assign(new Error(message), { status: 404 });
const conflict = (message: string): Error & { status?: number } => Object.assign(new Error(message), { status: 409 });

function now(): string { return new Date().toISOString(); }
function idFrom(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw bad('Identificador inválido.');
  return id;
}
function pageParams(req: Request) {
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const pageSize = req.query.pageSize === undefined ? 10 : Number(req.query.pageSize);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) throw bad('Parâmetros de paginação inválidos.');
  return { page, pageSize, offset: (page - 1) * pageSize };
}
function body(req: Request): Record<string, unknown> {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw bad('O corpo da requisição é inválido.');
  return req.body as Record<string, unknown>;
}
function clientRow(row: any) { return { id: row.id, name: row.name, email: row.email, company: row.company ?? null, createdAt: row.created_at, updatedAt: row.updated_at }; }
function dealRow(row: any) { return { id: row.id, title: row.title, valueInCents: row.value_in_cents, clientId: row.client_id, stage: row.stage, createdAt: row.created_at, updatedAt: row.updated_at }; }
function optionalText(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw bad(`${field} inválido.`);
  return value.trim();
}
function requiredText(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string') throw bad(`${field} é obrigatório.`);
  const text = value.trim();
  if (text.length < 2 || text.length > max) throw bad(`${field} deve ter entre 2 e ${max} caracteres.`);
  return text;
}
function email(value: unknown): string {
  if (typeof value !== 'string' || value.trim() !== value || !emailPattern.test(value)) throw bad('E-mail inválido.');
  return value;
}
function stage(value: unknown): Stage {
  if (typeof value !== 'string' || !stages.includes(value as Stage)) throw bad('Etapa inválida.');
  return value as Stage;
}
function clientExists(db: Db, id: number): boolean { return Boolean(db.prepare('SELECT id FROM clients WHERE id = ?').get(id)); }
function dealById(db: Db, id: number) { return db.prepare('SELECT * FROM deals WHERE id = ?').get(id); }

export function createApp(db: Db) {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.get('/api/clients', (req, res, next) => {
    try {
      const { page, pageSize, offset } = pageParams(req);
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const term = `%${search}%`;
      const where = search ? 'WHERE name LIKE ? OR email LIKE ? OR COALESCE(company, \'\') LIKE ?' : '';
      const args = search ? [term, term, term] : [];
      const total = (db.prepare(`SELECT COUNT(*) as count FROM clients ${where}`).get(...args) as any).count;
      const rows = db.prepare(`SELECT * FROM clients ${where} ORDER BY id LIMIT ? OFFSET ?`).all(...args, pageSize, offset).map(clientRow);
      res.json({ data: rows, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
    } catch (error) { next(error); }
  });

  app.post('/api/clients', (req, res, next) => {
    try {
      const input = body(req);
      const name = requiredText(input.name, 'Nome', 80);
      const mail = email(input.email);
      const company = optionalText(input.company, 'Empresa') || null;
      const timestamp = now();
      const result = db.prepare('INSERT INTO clients (name, email, company, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(name, mail, company, timestamp, timestamp);
      res.status(201).json(clientRow(db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid)));
    } catch (error: any) {
      if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') next(conflict('Este e-mail já está cadastrado.')); else next(error);
    }
  });

  app.patch('/api/clients/:id', (req, res, next) => {
    try {
      const id = idFrom(req);
      const current = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as any;
      if (!current) throw notFound('Cliente não encontrado.');
      const input = body(req);
      const name = input.name === undefined ? current.name : requiredText(input.name, 'Nome', 80);
      const mail = input.email === undefined ? current.email : email(input.email);
      const company = input.company === undefined ? current.company : (optionalText(input.company, 'Empresa') || null);
      const updatedAt = now();
      db.prepare('UPDATE clients SET name = ?, email = ?, company = ?, updated_at = ? WHERE id = ?').run(name, mail, company, updatedAt, id);
      res.json(clientRow(db.prepare('SELECT * FROM clients WHERE id = ?').get(id)));
    } catch (error: any) {
      if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') next(conflict('Este e-mail já está cadastrado.')); else next(error);
    }
  });

  app.delete('/api/clients/:id', (req, res, next) => {
    try {
      const id = idFrom(req);
      if (!db.prepare('SELECT id FROM clients WHERE id = ?').get(id)) throw notFound('Cliente não encontrado.');
      if (db.prepare('SELECT id FROM deals WHERE client_id = ? LIMIT 1').get(id)) throw conflict('Não é possível excluir um cliente com negócios relacionados.');
      db.prepare('DELETE FROM clients WHERE id = ?').run(id);
      res.status(204).send();
    } catch (error) { next(error); }
  });

  app.get('/api/deals', (req, res, next) => {
    try {
      const { page, pageSize, offset } = pageParams(req);
      const conditions: string[] = [];
      const args: unknown[] = [];
      if (typeof req.query.search === 'string' && req.query.search.trim()) { conditions.push('d.title LIKE ?'); args.push(`%${req.query.search.trim()}%`); }
      if (req.query.stage !== undefined) { conditions.push('d.stage = ?'); args.push(stage(req.query.stage)); }
      if (req.query.clientId !== undefined) { const clientId = Number(req.query.clientId); if (!Number.isInteger(clientId) || clientId < 1) throw bad('Cliente inválido.'); conditions.push('d.client_id = ?'); args.push(clientId); }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const total = (db.prepare(`SELECT COUNT(*) as count FROM deals d ${where}`).get(...args) as any).count;
      const rows = db.prepare(`SELECT d.* FROM deals d ${where} ORDER BY d.id LIMIT ? OFFSET ?`).all(...args, pageSize, offset).map(dealRow);
      res.json({ data: rows, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
    } catch (error) { next(error); }
  });

  app.post('/api/deals', (req, res, next) => {
    try {
      const input = body(req);
      const title = requiredText(input.title, 'Título', 120);
      const value = input.valueInCents;
      if (!Number.isInteger(value) || (value as number) < 0) throw bad('Valor deve ser um inteiro maior ou igual a zero.');
      if (!Number.isInteger(input.clientId) || (input.clientId as number) < 1 || !clientExists(db, input.clientId as number)) throw bad('Cliente inválido.');
      const currentStage = stage(input.stage);
      const timestamp = now();
      const result = db.prepare('INSERT INTO deals (title, value_in_cents, client_id, stage, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(title, value, input.clientId, currentStage, timestamp, timestamp);
      res.status(201).json(dealRow(dealById(db, Number(result.lastInsertRowid))));
    } catch (error) { next(error); }
  });

  app.patch('/api/deals/:id', (req, res, next) => {
    try {
      const id = idFrom(req);
      const current = dealById(db, id) as any;
      if (!current) throw notFound('Negócio não encontrado.');
      const input = body(req);
      const title = input.title === undefined ? current.title : requiredText(input.title, 'Título', 120);
      const value = input.valueInCents === undefined ? current.value_in_cents : input.valueInCents;
      if (!Number.isInteger(value) || (value as number) < 0) throw bad('Valor deve ser um inteiro maior ou igual a zero.');
      const clientId = input.clientId === undefined ? current.client_id : input.clientId;
      if (!Number.isInteger(clientId) || (clientId as number) < 1 || !clientExists(db, clientId as number)) throw bad('Cliente inválido.');
      const currentStage = input.stage === undefined ? current.stage : stage(input.stage);
      db.prepare('UPDATE deals SET title = ?, value_in_cents = ?, client_id = ?, stage = ?, updated_at = ? WHERE id = ?').run(title, value, clientId, currentStage, now(), id);
      res.json(dealRow(dealById(db, id)));
    } catch (error) { next(error); }
  });

  app.delete('/api/deals/:id', (req, res, next) => {
    try {
      const id = idFrom(req);
      if (!dealById(db, id)) throw notFound('Negócio não encontrado.');
      db.prepare('DELETE FROM deals WHERE id = ?').run(id);
      res.status(204).send();
    } catch (error) { next(error); }
  });

  app.get('/api/dashboard', (_req, res) => {
    const metrics = db.prepare(`SELECT COUNT(*) as totalClients, (SELECT COUNT(*) FROM deals WHERE stage != 'won') as openDeals, COALESCE((SELECT SUM(value_in_cents) FROM deals WHERE stage != 'won'), 0) as pipelineValueInCents FROM clients`).get() as any;
    res.json({ totalClients: metrics.totalClients, openDeals: metrics.openDeals, pipelineValueInCents: metrics.pipelineValueInCents });
  });

  app.use(express.static('dist'));
  app.use((req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile('index.html', { root: 'dist' }));
  app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));
  app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = error?.status || (error?.type === 'entity.parse.failed' ? 400 : 500);
    res.status(status).json({ error: status === 500 ? 'Erro interno do servidor.' : error.message });
  });
  return app;
}

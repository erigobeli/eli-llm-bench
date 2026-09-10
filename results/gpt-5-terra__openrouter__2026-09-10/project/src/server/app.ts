import express, { type Request, type Response } from 'express';
import type Database from 'better-sqlite3';
import { openDatabase, type Stage } from './db.js';

type Client = { id: number; name: string; email: string; company: string | null; createdAt: string; updatedAt: string };
type Deal = { id: number; title: string; valueInCents: number; clientId: number; stage: Stage; createdAt: string; updatedAt: string };
const stages: Stage[] = ['new', 'contact', 'proposal', 'won'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clientFromRow = (row: Record<string, unknown>): Client => ({
  id: row.id as number, name: row.name as string, email: row.email as string, company: row.company as string | null,
  createdAt: row.created_at as string, updatedAt: row.updated_at as string
});
const dealFromRow = (row: Record<string, unknown>): Deal => ({
  id: row.id as number, title: row.title as string, valueInCents: row.value_in_cents as number, clientId: row.client_id as number,
  stage: row.stage as Stage, createdAt: row.created_at as string, updatedAt: row.updated_at as string
});
const fail = (res: Response, status: number, error: string) => res.status(status).json({ error });
const parseId = (raw: string) => /^\d+$/.test(raw) && Number(raw) > 0 ? Number(raw) : null;

function pageParams(req: Request) {
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const pageSize = req.query.pageSize === undefined ? 10 : Number(req.query.pageSize);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) return null;
  return { page, pageSize };
}

function clientInput(body: unknown, base?: Client): Omit<Client, 'id' | 'createdAt' | 'updatedAt'> | string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Dados do cliente inválidos.';
  const data = body as Record<string, unknown>;
  const name = data.name === undefined ? base?.name : typeof data.name === 'string' ? data.name.trim() : '';
  const email = data.email === undefined ? base?.email : typeof data.email === 'string' ? data.email.trim() : '';
  const company = data.company === undefined ? base?.company ?? null : data.company === null || data.company === '' ? null : typeof data.company === 'string' ? data.company.trim() || null : undefined;
  if (!name || name.length < 2 || name.length > 80) return 'Nome deve ter entre 2 e 80 caracteres.';
  if (!email || !emailPattern.test(email)) return 'Informe um e-mail válido.';
  if (company === undefined) return 'Empresa inválida.';
  return { name, email, company };
}

function dealInput(body: unknown, base?: Deal): Omit<Deal, 'id' | 'createdAt' | 'updatedAt'> | string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Dados do negócio inválidos.';
  const data = body as Record<string, unknown>;
  const title = data.title === undefined ? base?.title : typeof data.title === 'string' ? data.title.trim() : '';
  const valueInCents = data.valueInCents === undefined ? base?.valueInCents : data.valueInCents;
  const clientId = data.clientId === undefined ? base?.clientId : data.clientId;
  const stage = data.stage === undefined ? base?.stage : data.stage;
  if (!title || title.length < 2 || title.length > 120) return 'Título deve ter entre 2 e 120 caracteres.';
  if (!Number.isInteger(valueInCents) || (valueInCents as number) < 0) return 'Valor deve ser um inteiro maior ou igual a zero.';
  if (!Number.isInteger(clientId) || (clientId as number) < 1) return 'Cliente inválido.';
  if (typeof stage !== 'string' || !stages.includes(stage as Stage)) return 'Etapa inválida.';
  return { title, valueInCents: valueInCents as number, clientId: clientId as number, stage: stage as Stage };
}

export function createApp(database?: Database.Database) {
  const db = database ?? openDatabase();
  const app = express();
  app.use(express.json());
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.get('/api/clients', (req, res) => {
    const paging = pageParams(req); if (!paging) return fail(res, 400, 'Paginação inválida.');
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const where = search ? 'WHERE lower(name) LIKE lower(?) OR lower(email) LIKE lower(?) OR lower(coalesce(company, \'\')) LIKE lower(?)' : '';
    const args = search ? Array(3).fill(`%${search}%`) : [];
    const total = (db.prepare(`SELECT count(*) AS total FROM clients ${where}`).get(...args) as { total: number }).total;
    const rows = db.prepare(`SELECT * FROM clients ${where} ORDER BY id LIMIT ? OFFSET ?`).all(...args, paging.pageSize, (paging.page - 1) * paging.pageSize) as Record<string, unknown>[];
    res.json({ data: rows.map(clientFromRow), pagination: { ...paging, total, totalPages: Math.ceil(total / paging.pageSize) } });
  });

  app.post('/api/clients', (req, res) => {
    const input = clientInput(req.body); if (typeof input === 'string') return fail(res, 400, input);
    const now = new Date().toISOString();
    try {
      const result = db.prepare('INSERT INTO clients (name, email, company, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(input.name, input.email, input.company, now, now);
      const row = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>;
      res.status(201).json(clientFromRow(row));
    } catch (error) { return fail(res, 409, 'Já existe um cliente com este e-mail.'); }
  });

  app.patch('/api/clients/:id', (req, res) => {
    const id = parseId(req.params.id); if (!id) return fail(res, 404, 'Cliente não encontrado.');
    const row = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return fail(res, 404, 'Cliente não encontrado.');
    const input = clientInput(req.body, clientFromRow(row)); if (typeof input === 'string') return fail(res, 400, input);
    try {
      const now = new Date().toISOString(); db.prepare('UPDATE clients SET name = ?, email = ?, company = ?, updated_at = ? WHERE id = ?').run(input.name, input.email, input.company, now, id);
      res.json(clientFromRow(db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as Record<string, unknown>));
    } catch (error) { return fail(res, 409, 'Já existe um cliente com este e-mail.'); }
  });

  app.delete('/api/clients/:id', (req, res) => {
    const id = parseId(req.params.id); if (!id || !db.prepare('SELECT 1 FROM clients WHERE id = ?').get(id)) return fail(res, 404, 'Cliente não encontrado.');
    if (db.prepare('SELECT 1 FROM deals WHERE client_id = ?').get(id)) return fail(res, 409, 'Não é possível excluir cliente com negócios relacionados.');
    db.prepare('DELETE FROM clients WHERE id = ?').run(id); res.status(204).end();
  });

  app.get('/api/deals', (req, res) => {
    const paging = pageParams(req); if (!paging) return fail(res, 400, 'Paginação inválida.');
    const conditions: string[] = []; const args: unknown[] = [];
    if (typeof req.query.search === 'string' && req.query.search.trim()) { conditions.push('lower(title) LIKE lower(?)'); args.push(`%${req.query.search.trim()}%`); }
    if (req.query.stage !== undefined) { if (typeof req.query.stage !== 'string' || !stages.includes(req.query.stage as Stage)) return fail(res, 400, 'Etapa inválida.'); conditions.push('stage = ?'); args.push(req.query.stage); }
    if (req.query.clientId !== undefined) { const clientId = Number(req.query.clientId); if (!Number.isInteger(clientId) || clientId < 1) return fail(res, 400, 'Cliente inválido.'); conditions.push('client_id = ?'); args.push(clientId); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = (db.prepare(`SELECT count(*) AS total FROM deals ${where}`).get(...args) as { total: number }).total;
    const rows = db.prepare(`SELECT * FROM deals ${where} ORDER BY id LIMIT ? OFFSET ?`).all(...args, paging.pageSize, (paging.page - 1) * paging.pageSize) as Record<string, unknown>[];
    res.json({ data: rows.map(dealFromRow), pagination: { ...paging, total, totalPages: Math.ceil(total / paging.pageSize) } });
  });

  app.post('/api/deals', (req, res) => {
    const input = dealInput(req.body); if (typeof input === 'string') return fail(res, 400, input);
    if (!db.prepare('SELECT 1 FROM clients WHERE id = ?').get(input.clientId)) return fail(res, 400, 'Cliente não encontrado.');
    const now = new Date().toISOString();
    const result = db.prepare('INSERT INTO deals (title, value_in_cents, client_id, stage, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(input.title, input.valueInCents, input.clientId, input.stage, now, now);
    res.status(201).json(dealFromRow(db.prepare('SELECT * FROM deals WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>));
  });

  app.patch('/api/deals/:id', (req, res) => {
    const id = parseId(req.params.id); if (!id) return fail(res, 404, 'Negócio não encontrado.');
    const row = db.prepare('SELECT * FROM deals WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return fail(res, 404, 'Negócio não encontrado.');
    const input = dealInput(req.body, dealFromRow(row)); if (typeof input === 'string') return fail(res, 400, input);
    if (!db.prepare('SELECT 1 FROM clients WHERE id = ?').get(input.clientId)) return fail(res, 400, 'Cliente não encontrado.');
    const now = new Date().toISOString(); db.prepare('UPDATE deals SET title = ?, value_in_cents = ?, client_id = ?, stage = ?, updated_at = ? WHERE id = ?').run(input.title, input.valueInCents, input.clientId, input.stage, now, id);
    res.json(dealFromRow(db.prepare('SELECT * FROM deals WHERE id = ?').get(id) as Record<string, unknown>));
  });

  app.delete('/api/deals/:id', (req, res) => {
    const id = parseId(req.params.id); if (!id || !db.prepare('SELECT 1 FROM deals WHERE id = ?').get(id)) return fail(res, 404, 'Negócio não encontrado.');
    db.prepare('DELETE FROM deals WHERE id = ?').run(id); res.status(204).end();
  });

  app.get('/api/dashboard', (_req, res) => {
    const totalClients = (db.prepare('SELECT count(*) AS total FROM clients').get() as { total: number }).total;
    const open = db.prepare("SELECT count(*) AS count, coalesce(sum(value_in_cents), 0) AS value FROM deals WHERE stage != 'won'").get() as { count: number; value: number };
    res.json({ totalClients, openDeals: open.count, pipelineValueInCents: open.value });
  });
  return app;
}

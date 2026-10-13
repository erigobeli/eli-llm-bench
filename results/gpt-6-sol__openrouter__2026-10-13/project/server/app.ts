import express, { type ErrorRequestHandler, type Request } from 'express';
import type Database from 'better-sqlite3';
import { resolve } from 'node:path';

type Client = { id: number; name: string; email: string; company: string | null; createdAt: string; updatedAt: string };
type Deal = { id: number; title: string; valueInCents: number; clientId: number; stage: string; createdAt: string; updatedAt: string };
type Input = Record<string, unknown>;

class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const bad = (message: string): never => { throw new ApiError(400, message); };
const stages = ['new', 'contact', 'proposal', 'won'];
const has = (data: Input, key: string) => Object.prototype.hasOwnProperty.call(data, key);
const object = (input: unknown): Input => input !== null && typeof input === 'object' && !Array.isArray(input) ? input as Input : bad('Envie um objeto JSON válido.');
const text = (value: unknown, field: string, max: number): string => {
  if (typeof value !== 'string' || value.trim().length < 2 || value.trim().length > max) bad(`${field} deve ter entre 2 e ${max} caracteres.`);
  return (value as string).trim();
};
const email = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) bad('Informe um e-mail válido.');
  return (value as string).trim();
};
const company = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') bad('Empresa deve ser um texto.');
  return (value as string).trim() || null;
};
const integer = (value: unknown, field: string, min = 0, max = Number.MAX_SAFE_INTEGER): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) bad(`${field} deve ser um número inteiro válido.`);
  return value as number;
};
const stage = (value: unknown): string => typeof value === 'string' && stages.includes(value) ? value : bad('Etapa inválida.');
const id = (raw: unknown): number => {
  if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw))) bad('Identificador inválido.');
  return Number(raw);
};
const optionalId = (raw: unknown) => raw === undefined ? undefined : id(raw);
const pageParam = (raw: unknown, fallback: number, max: number): number => {
  if (raw === undefined) return fallback;
  if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) > max) bad('Parâmetros de paginação inválidos.');
  return Number(raw);
};
const searchParam = (raw: unknown): string => raw === undefined ? '' : typeof raw === 'string' ? raw.trim() : bad('Busca inválida.');
const timestamp = (old?: string) => new Date(Math.max(Date.now(), old ? Date.parse(old) + 1 : 0)).toISOString();

export function createApp(db: Database.Database, serveFrontend = false) {
  const app = express();
  app.use(express.json());
  const clientById = db.prepare('SELECT * FROM clients WHERE id = ?');
  const dealById = db.prepare('SELECT * FROM deals WHERE id = ?');
  const ensureClient = (clientId: number) => {
    if (!clientById.get(clientId)) bad('Cliente informado não existe.');
    return clientId;
  };

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/dashboard', (_req, res) => {
    const totalClients = (db.prepare('SELECT count(*) AS total FROM clients').get() as { total: number }).total;
    const metrics = db.prepare("SELECT count(*) AS openDeals, coalesce(sum(valueInCents), 0) AS pipelineValueInCents FROM deals WHERE stage != 'won'").get();
    res.json({ totalClients, ...metrics as object });
  });

  app.get('/api/clients', (req, res) => {
    const page = pageParam(req.query.page, 1, Number.MAX_SAFE_INTEGER);
    const pageSize = pageParam(req.query.pageSize, 10, 50);
    const search = `%${searchParam(req.query.search).replace(/[\\%_]/g, '\\$&')}%`;
    const where = "WHERE (name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR company LIKE ? ESCAPE '\\')";
    const args = [search, search, search];
    const total = (db.prepare(`SELECT count(*) AS total FROM clients ${where}`).get(...args) as { total: number }).total;
    const data = db.prepare(`SELECT * FROM clients ${where} ORDER BY id ASC LIMIT ? OFFSET ?`).all(...args, pageSize, (page - 1) * pageSize);
    res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  });

  app.post('/api/clients', (req, res) => {
    const input = object(req.body);
    const name = text(input.name, 'Nome', 80);
    const mail = email(input.email);
    const org = company(input.company);
    if (db.prepare('SELECT id FROM clients WHERE email = ?').get(mail)) throw new ApiError(409, 'E-mail já cadastrado.');
    const now = timestamp();
    const result = db.prepare('INSERT INTO clients (name, email, company, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)').run(name, mail, org, now, now);
    res.status(201).json(clientById.get(result.lastInsertRowid));
  });

  app.patch('/api/clients/:id', (req, res) => {
    const existing = clientById.get(id(req.params.id)) as Client | undefined;
    if (!existing) throw new ApiError(404, 'Cliente não encontrado.');
    const input = object(req.body);
    const name = has(input, 'name') ? text(input.name, 'Nome', 80) : existing.name;
    const mail = has(input, 'email') ? email(input.email) : existing.email;
    const org = has(input, 'company') ? company(input.company) : existing.company;
    if (db.prepare('SELECT id FROM clients WHERE email = ? AND id != ?').get(mail, existing.id)) throw new ApiError(409, 'E-mail já cadastrado.');
    db.prepare('UPDATE clients SET name = ?, email = ?, company = ?, updatedAt = ? WHERE id = ?').run(name, mail, org, timestamp(existing.updatedAt), existing.id);
    res.json(clientById.get(existing.id));
  });

  app.delete('/api/clients/:id', (req, res) => {
    const clientId = id(req.params.id);
    if (!clientById.get(clientId)) throw new ApiError(404, 'Cliente não encontrado.');
    if (db.prepare('SELECT id FROM deals WHERE clientId = ? LIMIT 1').get(clientId)) throw new ApiError(409, 'Cliente possui negócios relacionados.');
    db.prepare('DELETE FROM clients WHERE id = ?').run(clientId);
    res.status(204).end();
  });

  app.get('/api/deals', (req, res) => {
    const page = pageParam(req.query.page, 1, Number.MAX_SAFE_INTEGER);
    const pageSize = pageParam(req.query.pageSize, 10, 50);
    const conditions = ["title LIKE ? ESCAPE '\\'"];
    const args: (string | number)[] = [`%${searchParam(req.query.search).replace(/[\\%_]/g, '\\$&')}%`];
    if (req.query.stage !== undefined) { conditions.push('stage = ?'); args.push(stage(req.query.stage)); }
    if (req.query.clientId !== undefined) { conditions.push('clientId = ?'); args.push(optionalId(req.query.clientId)!); }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const total = (db.prepare(`SELECT count(*) AS total FROM deals ${where}`).get(...args) as { total: number }).total;
    const data = db.prepare(`SELECT * FROM deals ${where} ORDER BY id ASC LIMIT ? OFFSET ?`).all(...args, pageSize, (page - 1) * pageSize);
    res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  });

  app.post('/api/deals', (req, res) => {
    const input = object(req.body);
    const title = text(input.title, 'Título', 120);
    const value = integer(input.valueInCents, 'Valor');
    const clientId = ensureClient(integer(input.clientId, 'Cliente', 1));
    const currentStage = stage(input.stage);
    const now = timestamp();
    const result = db.prepare('INSERT INTO deals (title, valueInCents, clientId, stage, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)').run(title, value, clientId, currentStage, now, now);
    res.status(201).json(dealById.get(result.lastInsertRowid));
  });

  app.patch('/api/deals/:id', (req, res) => {
    const existing = dealById.get(id(req.params.id)) as Deal | undefined;
    if (!existing) throw new ApiError(404, 'Negócio não encontrado.');
    const input = object(req.body);
    const title = has(input, 'title') ? text(input.title, 'Título', 120) : existing.title;
    const value = has(input, 'valueInCents') ? integer(input.valueInCents, 'Valor') : existing.valueInCents;
    const clientId = has(input, 'clientId') ? ensureClient(integer(input.clientId, 'Cliente', 1)) : existing.clientId;
    const currentStage = has(input, 'stage') ? stage(input.stage) : existing.stage;
    db.prepare('UPDATE deals SET title = ?, valueInCents = ?, clientId = ?, stage = ?, updatedAt = ? WHERE id = ?').run(title, value, clientId, currentStage, timestamp(existing.updatedAt), existing.id);
    res.json(dealById.get(existing.id));
  });

  app.delete('/api/deals/:id', (req, res) => {
    const dealId = id(req.params.id);
    if (!dealById.get(dealId)) throw new ApiError(404, 'Negócio não encontrado.');
    db.prepare('DELETE FROM deals WHERE id = ?').run(dealId);
    res.status(204).end();
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));
  if (serveFrontend) {
    const dist = resolve('dist');
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(resolve(dist, 'index.html')));
  }
  const errors: ErrorRequestHandler = (err: unknown, _req: Request, res, _next) => {
    if (err instanceof ApiError) { res.status(err.status).json({ error: err.message }); return; }
    if (err instanceof SyntaxError && 'body' in err) { res.status(400).json({ error: 'JSON inválido.' }); return; }
    if (err instanceof Error && /UNIQUE constraint failed/.test(err.message)) { res.status(409).json({ error: 'E-mail já cadastrado.' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  };
  app.use(errors);
  return app;
}

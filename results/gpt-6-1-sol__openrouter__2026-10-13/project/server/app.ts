import express, { type ErrorRequestHandler } from 'express';
import type Database from 'better-sqlite3';
import { z, ZodError } from 'zod';
import { resolve } from 'node:path';
import { stages, type Client, type Deal } from '../shared/types.js';

class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const text = (label: string, max: number) => z.string({ required_error: `${label} é obrigatório.`, invalid_type_error: `${label} deve ser um texto.` })
  .trim().min(2, `${label} deve ter pelo menos 2 caracteres.`).max(max, `${label} deve ter no máximo ${max} caracteres.`);
const clientSchema = z.object({
  name: text('Nome', 80),
  email: z.string({ required_error: 'E-mail é obrigatório.', invalid_type_error: 'E-mail inválido.' })
    .trim().email('Informe um e-mail válido.').transform(value => value.toLowerCase()),
  company: z.string({ invalid_type_error: 'Empresa deve ser um texto.' }).trim().nullable().optional().transform(value => value || null),
}, { invalid_type_error: 'Envie um objeto JSON válido.', required_error: 'Envie os dados do cliente.' });
const dealSchema = z.object({
  title: text('Título', 120),
  valueInCents: z.number({ required_error: 'Valor é obrigatório.', invalid_type_error: 'Valor deve ser um número inteiro em centavos.' })
    .int('Valor deve ser inteiro em centavos.').nonnegative('Valor não pode ser negativo.').max(Number.MAX_SAFE_INTEGER, 'Valor acima do limite permitido.'),
  clientId: z.number({ required_error: 'Cliente é obrigatório.', invalid_type_error: 'Cliente inválido.' }).int('Cliente inválido.').positive('Cliente inválido.'),
  stage: z.enum(stages, { errorMap: () => ({ message: 'Etapa inválida. Use Novo, Em contato, Proposta ou Fechado.' }) }),
}, { invalid_type_error: 'Envie um objeto JSON válido.', required_error: 'Envie os dados do negócio.' });
function integer(value: unknown, fallback: number | undefined, label: string, max = Number.MAX_SAFE_INTEGER): number {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > max) {
    throw new ApiError(400, `${label} inválido.`);
  }
  return Number(value);
}
function searchValue(value: unknown) {
  if (value === undefined) return '';
  if (typeof value !== 'string') throw new ApiError(400, 'Busca inválida.');
  return value.trim().toLocaleLowerCase('pt-BR');
}
function timestamp(previous: string) {
  return new Date(Math.max(Date.now(), Date.parse(previous) + 1)).toISOString();
}
function list(db: Database.Database, table: 'clients' | 'deals', conditions: string[], params: (string | number)[], page: number, pageSize: number) {
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM ${table} ${where}`).get(...params) as { total: number };
  const data = db.prepare(`SELECT * FROM ${table} ${where} ORDER BY id ASC LIMIT ? OFFSET ?`).all(...params, pageSize, (page - 1) * pageSize);
  return { data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

export function createApp(db: Database.Database, frontendPath?: string) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/dashboard', (_req, res) => {
    const { totalClients } = db.prepare('SELECT COUNT(*) AS totalClients FROM clients').get() as { totalClients: number };
    const totals = db.prepare("SELECT COUNT(*) AS openDeals, COALESCE(SUM(valueInCents), 0) AS pipelineValueInCents FROM deals WHERE stage != 'won'").get() as object;
    res.json({ totalClients, ...totals });
  });
  app.get('/api/clients', (req, res) => {
    const page = integer(req.query.page, 1, 'Página');
    const pageSize = integer(req.query.pageSize, 10, 'Tamanho da página', 50);
    const search = searchValue(req.query.search);
    res.json(list(db, 'clients', search ? ["(instr(casefold(name), ?) > 0 OR instr(casefold(email), ?) > 0 OR instr(casefold(company), ?) > 0)"] : [], search ? [search, search, search] : [], page, pageSize));
  });
  app.post('/api/clients', (req, res) => {
    const data = clientSchema.parse(req.body);
    const now = new Date().toISOString();
    const result = db.prepare('INSERT INTO clients (name, email, company, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)')
      .run(data.name, data.email, data.company, now, now);
    res.status(201).json(db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid));
  });
  app.patch('/api/clients/:id', (req, res) => {
    const id = integer(req.params.id, undefined, 'Identificador');
    const current = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as Client | undefined;
    if (!current) throw new ApiError(404, 'Cliente não encontrado.');
    const patch = clientSchema.partial().parse(req.body);
    const data = { ...current, ...patch, updatedAt: timestamp(current.updatedAt) };
    db.prepare('UPDATE clients SET name = ?, email = ?, company = ?, updatedAt = ? WHERE id = ?')
      .run(data.name, data.email, data.company, data.updatedAt, id);
    res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(id));
  });
  app.delete('/api/clients/:id', (req, res) => {
    const id = integer(req.params.id, undefined, 'Identificador');
    if (!db.prepare('SELECT id FROM clients WHERE id = ?').get(id)) throw new ApiError(404, 'Cliente não encontrado.');
    if (db.prepare('SELECT id FROM deals WHERE clientId = ? LIMIT 1').get(id)) throw new ApiError(409, 'Este cliente possui negócios relacionados e não pode ser excluído.');
    db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    res.status(204).end();
  });
  app.get('/api/deals', (req, res) => {
    const page = integer(req.query.page, 1, 'Página');
    const pageSize = integer(req.query.pageSize, 10, 'Tamanho da página', 50);
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    const search = searchValue(req.query.search);
    if (search) { conditions.push('instr(casefold(title), ?) > 0'); params.push(search); }
    if (req.query.stage !== undefined) {
      const stage = z.enum(stages, { errorMap: () => ({ message: 'Filtro de etapa inválido.' }) }).parse(req.query.stage);
      conditions.push('stage = ?'); params.push(stage);
    }
    if (req.query.clientId !== undefined) { conditions.push('clientId = ?'); params.push(integer(req.query.clientId, undefined, 'Filtro de cliente')); }
    res.json(list(db, 'deals', conditions, params, page, pageSize));
  });
  app.post('/api/deals', (req, res) => {
    const data = dealSchema.parse(req.body);
    if (!db.prepare('SELECT id FROM clients WHERE id = ?').get(data.clientId)) throw new ApiError(400, 'Selecione um cliente existente.');
    const now = new Date().toISOString();
    const result = db.prepare('INSERT INTO deals (title, valueInCents, clientId, stage, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)')
      .run(data.title, data.valueInCents, data.clientId, data.stage, now, now);
    res.status(201).json(db.prepare('SELECT * FROM deals WHERE id = ?').get(result.lastInsertRowid));
  });
  app.patch('/api/deals/:id', (req, res) => {
    const id = integer(req.params.id, undefined, 'Identificador');
    const current = db.prepare('SELECT * FROM deals WHERE id = ?').get(id) as Deal | undefined;
    if (!current) throw new ApiError(404, 'Negócio não encontrado.');
    const data = { ...current, ...dealSchema.partial().parse(req.body), updatedAt: timestamp(current.updatedAt) };
    if (!db.prepare('SELECT id FROM clients WHERE id = ?').get(data.clientId)) throw new ApiError(400, 'Selecione um cliente existente.');
    db.prepare('UPDATE deals SET title = ?, valueInCents = ?, clientId = ?, stage = ?, updatedAt = ? WHERE id = ?')
      .run(data.title, data.valueInCents, data.clientId, data.stage, data.updatedAt, id);
    res.json(db.prepare('SELECT * FROM deals WHERE id = ?').get(id));
  });
  app.delete('/api/deals/:id', (req, res) => {
    const id = integer(req.params.id, undefined, 'Identificador');
    const result = db.prepare('DELETE FROM deals WHERE id = ?').run(id);
    if (!result.changes) throw new ApiError(404, 'Negócio não encontrado.');
    res.status(204).end();
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));
  if (frontendPath) {
    app.use(express.static(frontendPath));
    app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => res.sendFile(resolve(frontendPath, 'index.html')));
  }
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ZodError) { res.status(400).json({ error: error.issues[0]?.message || 'Dados inválidos.' }); return; }
    if (error instanceof ApiError) { res.status(error.status).json({ error: error.message }); return; }
    if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') { res.status(409).json({ error: 'Este e-mail já está cadastrado.' }); return; }
    if (error?.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') { res.status(409).json({ error: 'Existem registros relacionados a este cliente.' }); return; }
    if (error?.type === 'entity.parse.failed') { res.status(400).json({ error: 'JSON inválido.' }); return; }
    if (error?.type === 'entity.too.large') { res.status(400).json({ error: 'Dados enviados excedem o limite permitido.' }); return; }
    console.error('Erro interno na API:', error instanceof Error ? error.message : 'erro desconhecido');
    res.status(500).json({ error: 'Não foi possível concluir a operação.' });
  };
  app.use(errors);
  return app;
}

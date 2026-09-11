import { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb, nowIso } from '../db';
import {
  isStage,
  readPagination,
  sendError,
  toInt,
} from '../validation';

export interface DealRow {
  id: number;
  title: string;
  value_in_cents: number;
  client_id: number;
  stage: string;
  created_at: string;
  updated_at: string;
}

export function serialiseDeal(row: DealRow) {
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

function clientExists(id: number): boolean {
  return Boolean(getDb().prepare('SELECT id FROM clients WHERE id = ?').get(id));
}

export const dealsRouter = Router();

dealsRouter.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { page, pageSize } = readPagination(req);
  const search = String(req.query.search ?? '').trim();
  const stage = req.query.stage !== undefined ? String(req.query.stage) : '';
  const clientId = req.query.clientId !== undefined ? toInt(req.query.clientId) : undefined;

  const where: string[] = [];
  const params: unknown[] = [];
  if (search) {
    where.push('LOWER(title) LIKE ?');
    params.push(`%${search.toLowerCase()}%`);
  }
  if (stage) {
    if (!isStage(stage)) {
      return sendError(res, 400, 'Etapa inválida.');
    }
    where.push('stage = ?');
    params.push(stage);
  }
  if (clientId !== undefined && clientId !== null) {
    where.push('client_id = ?');
    params.push(clientId);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM deals ${whereSql}`).get(...params) as {
      c: number;
    }
  ).c;

  const rows = db
    .prepare(
      `SELECT * FROM deals ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize) as DealRow[];

  res.json({
    data: rows.map(serialiseDeal),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
});

dealsRouter.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const id = toInt(req.params.id);
  if (id === null) return sendError(res, 404, 'Negócio não encontrado.');
  const row = db.prepare('SELECT * FROM deals WHERE id = ?').get(id) as
    | DealRow
    | undefined;
  if (!row) return sendError(res, 404, 'Negócio não encontrado.');
  res.json(serialiseDeal(row));
});

dealsRouter.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const body = req.body ?? {};

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const valueInCents = toInt(body.valueInCents);
  const clientId = toInt(body.clientId);
  const stage = body.stage;

  if (title.length < 2 || title.length > 120) {
    return sendError(res, 400, 'Título deve ter entre 2 e 120 caracteres.');
  }
  if (valueInCents === null || valueInCents < 0) {
    return sendError(res, 400, 'Valor deve ser um inteiro maior ou igual a zero.');
  }
  if (clientId === null || !clientExists(clientId)) {
    return sendError(res, 400, 'Cliente inválido.');
  }
  if (!isStage(stage)) {
    return sendError(res, 400, 'Etapa inválida.');
  }

  const ts = nowIso();
  const info = db
    .prepare(
      `INSERT INTO deals (title, value_in_cents, client_id, stage, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(title, valueInCents, clientId, stage, ts, ts);

  const row = db
    .prepare('SELECT * FROM deals WHERE id = ?')
    .get(info.lastInsertRowid) as DealRow;
  res.status(201).json(serialiseDeal(row));
});

dealsRouter.patch('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const id = toInt(req.params.id);
  if (id === null) return sendError(res, 404, 'Negócio não encontrado.');

  const current = db.prepare('SELECT * FROM deals WHERE id = ?').get(id) as
    | DealRow
    | undefined;
  if (!current) return sendError(res, 404, 'Negócio não encontrado.');

  const body = req.body ?? {};
  const updates: Record<string, string | number> = {};

  if (body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (title.length < 2 || title.length > 120) {
      return sendError(res, 400, 'Título deve ter entre 2 e 120 caracteres.');
    }
    updates.title = title;
  }

  if (body.valueInCents !== undefined) {
    const valueInCents = toInt(body.valueInCents);
    if (valueInCents === null || valueInCents < 0) {
      return sendError(res, 400, 'Valor deve ser um inteiro maior ou igual a zero.');
    }
    updates.value_in_cents = valueInCents;
  }

  if (body.clientId !== undefined) {
    const clientId = toInt(body.clientId);
    if (clientId === null || !clientExists(clientId)) {
      return sendError(res, 400, 'Cliente inválido.');
    }
    updates.client_id = clientId;
  }

  if (body.stage !== undefined) {
    if (!isStage(body.stage)) {
      return sendError(res, 400, 'Etapa inválida.');
    }
    updates.stage = body.stage;
  }

  if (Object.keys(updates).length === 0) {
    return res.json(serialiseDeal(current));
  }

  updates.updated_at = nowIso();
  const setSql = Object.keys(updates)
    .map((key) => `${key} = ?`)
    .join(', ');
  db.prepare(`UPDATE deals SET ${setSql} WHERE id = ?`).run(
    ...Object.values(updates),
    id
  );

  const row = db.prepare('SELECT * FROM deals WHERE id = ?').get(id) as DealRow;
  res.json(serialiseDeal(row));
});

dealsRouter.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const id = toInt(req.params.id);
  if (id === null) return sendError(res, 404, 'Negócio não encontrado.');

  const current = db.prepare('SELECT id FROM deals WHERE id = ?').get(id);
  if (!current) return sendError(res, 404, 'Negócio não encontrado.');

  db.prepare('DELETE FROM deals WHERE id = ?').run(id);
  res.status(204).end();
});

import { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb, nowIso } from '../db';
import {
  isValidEmail,
  readPagination,
  sendError,
  toInt,
} from '../validation';

export interface ClientRow {
  id: number;
  name: string;
  email: string;
  company: string | null;
  created_at: string;
  updated_at: string;
}

export function serialiseClient(row: ClientRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function emailExists(email: string, ignoreId?: number): boolean {
  const db = getDb();
  const sql = ignoreId
    ? 'SELECT id FROM clients WHERE email = ? COLLATE NOCASE AND id <> ?'
    : 'SELECT id FROM clients WHERE email = ? COLLATE NOCASE';
  const params = ignoreId ? [email, ignoreId] : [email];
  return Boolean(db.prepare(sql).get(...params));
}

export const clientsRouter = Router();

clientsRouter.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { page, pageSize } = readPagination(req);
  const search = String(req.query.search ?? '').trim();

  const where: string[] = [];
  const params: unknown[] = [];
  if (search) {
    where.push('(LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(IFNULL(company, \'\')) LIKE ?)');
    const like = `%${search.toLowerCase()}%`;
    params.push(like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM clients ${whereSql}`).get(...params) as { c: number }
  ).c;

  const rows = db
    .prepare(
      `SELECT * FROM clients ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, (page - 1) * pageSize) as ClientRow[];

  res.json({
    data: rows.map(serialiseClient),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
});

clientsRouter.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const id = toInt(req.params.id);
  if (id === null) return sendError(res, 404, 'Cliente não encontrado.');
  const row = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as
    | ClientRow
    | undefined;
  if (!row) return sendError(res, 404, 'Cliente não encontrado.');
  res.json(serialiseClient(row));
});

clientsRouter.post('/', (req: Request, res: Response) => {
  const db = getDb();
  const body = req.body ?? {};

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  let company: string | null = null;
  if (body.company !== undefined && body.company !== null && String(body.company).trim() !== '') {
    company = String(body.company).trim();
  }

  if (name.length < 2 || name.length > 80) {
    return sendError(res, 400, 'Nome deve ter entre 2 e 80 caracteres.');
  }
  if (!email || !isValidEmail(email)) {
    return sendError(res, 400, 'E-mail inválido.');
  }
  if (company !== null && company.length > 120) {
    return sendError(res, 400, 'Empresa deve ter no máximo 120 caracteres.');
  }
  if (emailExists(email)) {
    return sendError(res, 409, 'Já existe um cliente com este e-mail.');
  }

  const ts = nowIso();
  const info = db
    .prepare(
      `INSERT INTO clients (name, email, company, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(name, email, company, ts, ts);

  const row = db
    .prepare('SELECT * FROM clients WHERE id = ?')
    .get(info.lastInsertRowid) as ClientRow;
  res.status(201).json(serialiseClient(row));
});

clientsRouter.patch('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const id = toInt(req.params.id);
  if (id === null) return sendError(res, 404, 'Cliente não encontrado.');

  const current = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as
    | ClientRow
    | undefined;
  if (!current) return sendError(res, 404, 'Cliente não encontrado.');

  const body = req.body ?? {};
  const updates: Record<string, string | null> = {};

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (name.length < 2 || name.length > 80) {
      return sendError(res, 400, 'Nome deve ter entre 2 e 80 caracteres.');
    }
    updates.name = name;
  }

  if (body.email !== undefined) {
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email || !isValidEmail(email)) {
      return sendError(res, 400, 'E-mail inválido.');
    }
    if (emailExists(email, id)) {
      return sendError(res, 409, 'Já existe um cliente com este e-mail.');
    }
    updates.email = email;
  }

  if (body.company !== undefined) {
    if (body.company === null || String(body.company).trim() === '') {
      updates.company = null;
    } else {
      const company = String(body.company).trim();
      if (company.length > 120) {
        return sendError(res, 400, 'Empresa deve ter no máximo 120 caracteres.');
      }
      updates.company = company;
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.json(serialiseClient(current));
  }

  updates.updated_at = nowIso();
  const setSql = Object.keys(updates)
    .map((key) => `${key} = ?`)
    .join(', ');
  db.prepare(`UPDATE clients SET ${setSql} WHERE id = ?`).run(
    ...Object.values(updates),
    id
  );

  const row = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as ClientRow;
  res.json(serialiseClient(row));
});

clientsRouter.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const id = toInt(req.params.id);
  if (id === null) return sendError(res, 404, 'Cliente não encontrado.');

  const current = db.prepare('SELECT id FROM clients WHERE id = ?').get(id);
  if (!current) return sendError(res, 404, 'Cliente não encontrado.');

  const dealCount = (
    db.prepare('SELECT COUNT(*) AS c FROM deals WHERE client_id = ?').get(id) as {
      c: number;
    }
  ).c;
  if (dealCount > 0) {
    return sendError(
      res,
      409,
      'Não é possível excluir um cliente com negócios relacionados.'
    );
  }

  db.prepare('DELETE FROM clients WHERE id = ?').run(id);
  res.status(204).end();
});

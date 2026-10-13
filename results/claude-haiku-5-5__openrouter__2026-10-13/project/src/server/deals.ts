import { Router } from 'express';
import type { Deal, Paginated, Stage } from '../shared/types.js';
import type { Db } from './db.js';
import { foldText } from './db.js';
import {
  badRequest,
  escapeLike,
  notFound,
  paginationMeta,
  parseIdParam,
  parseIdQuery,
  parseOptionalText,
  parsePagination,
} from './http.js';
import { parseDealInput, STAGES } from './validation.js';

interface DealRow {
  id: number;
  title: string;
  value_in_cents: number;
  client_id: number;
  client_name: string;
  stage: Stage;
  created_at: string;
  updated_at: string;
}

const SELECT_DEALS = `
  SELECT d.id, d.title, d.value_in_cents, d.client_id, c.name AS client_name,
         d.stage, d.created_at, d.updated_at
  FROM deals d
  JOIN clients c ON c.id = d.client_id`;

const toDeal = (row: DealRow): Deal => ({
  id: row.id,
  title: row.title,
  valueInCents: row.value_in_cents,
  clientId: row.client_id,
  clientName: row.client_name,
  stage: row.stage,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function dealRoutes(db: Db): Router {
  const router = Router();

  const findById = db.prepare<[number], DealRow>(`${SELECT_DEALS} WHERE d.id = ?`);
  const clientExists = db.prepare<[number], { id: number }>('SELECT id FROM clients WHERE id = ?');

  function assertClientExists(clientId: number): void {
    if (!clientExists.get(clientId)) throw badRequest('O cliente informado não existe.');
  }

  router.get('/', (req, res) => {
    const { page, pageSize, offset } = parsePagination(req.query);
    const search = parseOptionalText(req.query.search, 'search');
    const stage = parseOptionalText(req.query.stage, 'stage');
    const clientId = parseIdQuery(req.query.clientId, 'clientId');

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (search) {
      conditions.push(`fold_text(d.title) LIKE ? ESCAPE '\\'`);
      params.push(`%${escapeLike(foldText(search) ?? '')}%`);
    }
    if (stage !== undefined) {
      if (!(STAGES as readonly string[]).includes(stage)) throw badRequest('A etapa informada é inválida.');
      conditions.push('d.stage = ?');
      params.push(stage);
    }
    if (clientId !== undefined) {
      conditions.push('d.client_id = ?');
      params.push(clientId);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { total } = db
      .prepare<unknown[], { total: number }>(
        `SELECT COUNT(*) AS total FROM deals d ${where}`,
      )
      .get(...params) as { total: number };
    const rows = db
      .prepare<unknown[], DealRow>(
        `${SELECT_DEALS} ${where} ORDER BY d.created_at DESC, d.id DESC LIMIT ? OFFSET ?`,
      )
      .all(...params, pageSize, offset);

    const body: Paginated<Deal> = {
      data: rows.map(toDeal),
      pagination: paginationMeta(page, pageSize, total),
    };
    res.json(body);
  });

  router.post('/', (req, res) => {
    const input = parseDealInput(req.body, false) as Required<ReturnType<typeof parseDealInput>>;
    assertClientExists(input.clientId);
    const now = new Date().toISOString();
    const result = db
      .prepare(
        'INSERT INTO deals (title, value_in_cents, client_id, stage, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(input.title, input.valueInCents, input.clientId, input.stage, now, now);
    res.status(201).json(toDeal(findById.get(Number(result.lastInsertRowid)) as DealRow));
  });

  router.patch('/:id', (req, res) => {
    const id = parseIdParam(req.params.id);
    const existing = id === null ? undefined : findById.get(id);
    if (!existing) throw notFound('Negócio não encontrado.');

    const input = parseDealInput(req.body, true);
    if (input.clientId !== undefined) assertClientExists(input.clientId);

    const title = input.title ?? existing.title;
    const valueInCents = input.valueInCents ?? existing.value_in_cents;
    const clientId = input.clientId ?? existing.client_id;
    const stage = input.stage ?? existing.stage;
    const now = new Date().toISOString();
    db.prepare(
      'UPDATE deals SET title = ?, value_in_cents = ?, client_id = ?, stage = ?, updated_at = ? WHERE id = ?',
    ).run(title, valueInCents, clientId, stage, now, existing.id);
    res.json(toDeal(findById.get(existing.id) as DealRow));
  });

  router.delete('/:id', (req, res) => {
    const id = parseIdParam(req.params.id);
    const existing = id === null ? undefined : findById.get(id);
    if (!existing) throw notFound('Negócio não encontrado.');
    db.prepare('DELETE FROM deals WHERE id = ?').run(existing.id);
    res.status(204).end();
  });

  return router;
}

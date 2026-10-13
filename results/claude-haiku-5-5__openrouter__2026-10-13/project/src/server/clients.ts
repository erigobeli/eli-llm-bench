import { Router } from 'express';
import type { Client, Paginated } from '../shared/types.js';
import type { Db } from './db.js';
import { foldText } from './db.js';
import { conflict, escapeLike, notFound, paginationMeta, parseIdParam, parseOptionalText, parsePagination } from './http.js';
import { parseClientInput } from './validation.js';

interface ClientRow {
  id: number;
  name: string;
  email: string;
  company: string | null;
  created_at: string;
  updated_at: string;
}

const toClient = (row: ClientRow): Client => ({
  id: row.id,
  name: row.name,
  email: row.email,
  company: row.company,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function clientRoutes(db: Db): Router {
  const router = Router();

  const findById = db.prepare<[number], ClientRow>('SELECT * FROM clients WHERE id = ?');
  const emailTaken = db.prepare<[string, number], { id: number }>(
    'SELECT id FROM clients WHERE email = ? COLLATE NOCASE AND id <> ?',
  );
  const countDeals = db.prepare<[number], { total: number }>(
    'SELECT COUNT(*) AS total FROM deals WHERE client_id = ?',
  );

  function assertEmailAvailable(email: string, ignoreId: number): void {
    if (emailTaken.get(email, ignoreId)) {
      throw conflict('Já existe um cliente cadastrado com este e-mail.');
    }
  }

  router.get('/', (req, res) => {
    const { page, pageSize, offset } = parsePagination(req.query);
    const search = parseOptionalText(req.query.search, 'search');
    const where = search
      ? `WHERE fold_text(name) LIKE ? ESCAPE '\\' OR fold_text(email) LIKE ? ESCAPE '\\' OR fold_text(company) LIKE ? ESCAPE '\\'`
      : '';
    const term = search ? `%${escapeLike(foldText(search) ?? '')}%` : null;
    const params = term ? [term, term, term] : [];

    const { total } = db
      .prepare<unknown[], { total: number }>(`SELECT COUNT(*) AS total FROM clients ${where}`)
      .get(...params) as { total: number };
    const rows = db
      .prepare<unknown[], ClientRow>(
        `SELECT * FROM clients ${where} ORDER BY fold_text(name), id LIMIT ? OFFSET ?`,
      )
      .all(...params, pageSize, offset);

    const body: Paginated<Client> = {
      data: rows.map(toClient),
      pagination: paginationMeta(page, pageSize, total),
    };
    res.json(body);
  });

  router.post('/', (req, res) => {
    const input = parseClientInput(req.body, false) as Required<ReturnType<typeof parseClientInput>>;
    assertEmailAvailable(input.email, -1);
    const now = new Date().toISOString();
    const result = db
      .prepare('INSERT INTO clients (name, email, company, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(input.name, input.email, input.company, now, now);
    const row = findById.get(Number(result.lastInsertRowid)) as ClientRow;
    res.status(201).json(toClient(row));
  });

  router.patch('/:id', (req, res) => {
    const id = parseIdParam(req.params.id);
    const existing = id === null ? undefined : findById.get(id);
    if (!existing) throw notFound('Cliente não encontrado.');

    const input = parseClientInput(req.body, true);
    if (input.email !== undefined) assertEmailAvailable(input.email, existing.id);

    const name = input.name ?? existing.name;
    const email = input.email ?? existing.email;
    const company = input.company !== undefined ? input.company : existing.company;
    const now = new Date().toISOString();
    db.prepare('UPDATE clients SET name = ?, email = ?, company = ?, updated_at = ? WHERE id = ?').run(
      name,
      email,
      company,
      now,
      existing.id,
    );
    res.json(toClient(findById.get(existing.id) as ClientRow));
  });

  router.delete('/:id', (req, res) => {
    const id = parseIdParam(req.params.id);
    const existing = id === null ? undefined : findById.get(id);
    if (!existing) throw notFound('Cliente não encontrado.');
    const { total } = countDeals.get(existing.id) as { total: number };
    if (total > 0) {
      throw conflict('Este cliente possui negócios relacionados e não pode ser excluído.');
    }
    db.prepare('DELETE FROM clients WHERE id = ?').run(existing.id);
    res.status(204).end();
  });

  return router;
}

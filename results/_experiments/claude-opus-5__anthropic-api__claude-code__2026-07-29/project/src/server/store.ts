import type { AppDatabase } from './db';
import { conflict, notFound } from './errors';
import type { Client, Deal, Paginated, Stage } from './types';

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Garante que `updatedAt` mude mesmo em atualizações no mesmo milissegundo.
 */
function nextTimestamp(previous: string): string {
  const now = nowIso();
  if (now !== previous) return now;
  return new Date(Date.parse(previous) + 1).toISOString();
}

function buildPagination(total: number, page: number, pageSize: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

/* -------------------------------------------------------------------------- */
/* Clientes                                                                   */
/* -------------------------------------------------------------------------- */

export interface ListClientsOptions {
  search: string;
  page: number;
  pageSize: number;
}

export function listClients(db: AppDatabase, options: ListClientsOptions): Paginated<Client> {
  const { search, page, pageSize } = options;
  const where = search ? 'WHERE lower(name) LIKE ? OR lower(email) LIKE ? OR lower(ifnull(company, \'\')) LIKE ?' : '';
  const term = `%${search.toLowerCase()}%`;
  const params = search ? [term, term, term] : [];

  const total = (
    db.prepare(`SELECT COUNT(*) AS total FROM clients ${where}`).get(...params) as { total: number }
  ).total;

  const data = db
    .prepare(
      `SELECT id, name, email, company, createdAt, updatedAt
         FROM clients ${where}
        ORDER BY datetime(createdAt) DESC, id DESC
        LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, (page - 1) * pageSize) as Client[];

  return { data, pagination: buildPagination(total, page, pageSize) };
}

export function getClient(db: AppDatabase, id: number): Client | undefined {
  return db
    .prepare('SELECT id, name, email, company, createdAt, updatedAt FROM clients WHERE id = ?')
    .get(id) as Client | undefined;
}

export function getClientOrFail(db: AppDatabase, id: number): Client {
  const client = getClient(db, id);
  if (!client) throw notFound('Cliente não encontrado.');
  return client;
}

function assertEmailAvailable(db: AppDatabase, email: string, ignoreId?: number): void {
  const row = db
    .prepare('SELECT id FROM clients WHERE lower(email) = lower(?) AND id IS NOT ?')
    .get(email, ignoreId ?? null) as { id: number } | undefined;
  if (row) throw conflict('Já existe um cliente com este e-mail.');
}

export interface CreateClientInput {
  name: string;
  email: string;
  company: string | null;
}

export function createClient(db: AppDatabase, input: CreateClientInput): Client {
  assertEmailAvailable(db, input.email);
  const timestamp = nowIso();
  const info = db
    .prepare(
      `INSERT INTO clients (name, email, company, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(input.name, input.email, input.company, timestamp, timestamp);
  return getClient(db, Number(info.lastInsertRowid))!;
}

export interface UpdateClientInput {
  name?: string;
  email?: string;
  company?: string | null;
}

export function updateClient(db: AppDatabase, id: number, input: UpdateClientInput): Client {
  const current = getClientOrFail(db, id);
  if (input.email !== undefined) {
    assertEmailAvailable(db, input.email, id);
  }
  const updatedAt = nextTimestamp(current.updatedAt);
  db.prepare(
    `UPDATE clients
        SET name = ?, email = ?, company = ?, updatedAt = ?
      WHERE id = ?`,
  ).run(
    input.name ?? current.name,
    input.email ?? current.email,
    input.company !== undefined ? input.company : current.company,
    updatedAt,
    id,
  );
  return getClient(db, id)!;
}

export function deleteClient(db: AppDatabase, id: number): void {
  getClientOrFail(db, id);
  const linked = (
    db.prepare('SELECT COUNT(*) AS total FROM deals WHERE clientId = ?').get(id) as {
      total: number;
    }
  ).total;
  if (linked > 0) {
    throw conflict('Não é possível excluir um cliente com negócios relacionados.');
  }
  db.prepare('DELETE FROM clients WHERE id = ?').run(id);
}

/* -------------------------------------------------------------------------- */
/* Negócios                                                                   */
/* -------------------------------------------------------------------------- */

export interface ListDealsOptions {
  search: string;
  stage?: Stage;
  clientId?: number;
  page: number;
  pageSize: number;
}

export function listDeals(db: AppDatabase, options: ListDealsOptions): Paginated<Deal> {
  const { search, stage, clientId, page, pageSize } = options;
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (search) {
    clauses.push('lower(title) LIKE ?');
    params.push(`%${search.toLowerCase()}%`);
  }
  if (stage) {
    clauses.push('stage = ?');
    params.push(stage);
  }
  if (clientId !== undefined) {
    clauses.push('clientId = ?');
    params.push(clientId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const total = (
    db.prepare(`SELECT COUNT(*) AS total FROM deals ${where}`).get(...params) as { total: number }
  ).total;

  const data = db
    .prepare(
      `SELECT id, title, valueInCents, clientId, stage, createdAt, updatedAt
         FROM deals ${where}
        ORDER BY datetime(createdAt) DESC, id DESC
        LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, (page - 1) * pageSize) as Deal[];

  return { data, pagination: buildPagination(total, page, pageSize) };
}

export function listAllDealsByStage(db: AppDatabase): Deal[] {
  return db
    .prepare(
      `SELECT id, title, valueInCents, clientId, stage, createdAt, updatedAt
         FROM deals
        ORDER BY datetime(createdAt) DESC, id DESC`,
    )
    .all() as Deal[];
}

export function getDeal(db: AppDatabase, id: number): Deal | undefined {
  return db
    .prepare(
      'SELECT id, title, valueInCents, clientId, stage, createdAt, updatedAt FROM deals WHERE id = ?',
    )
    .get(id) as Deal | undefined;
}

export function getDealOrFail(db: AppDatabase, id: number): Deal {
  const deal = getDeal(db, id);
  if (!deal) throw notFound('Negócio não encontrado.');
  return deal;
}

export interface CreateDealInput {
  title: string;
  valueInCents: number;
  clientId: number;
  stage: Stage;
}

export function createDeal(db: AppDatabase, input: CreateDealInput): Deal {
  const timestamp = nowIso();
  const info = db
    .prepare(
      `INSERT INTO deals (title, valueInCents, clientId, stage, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(input.title, input.valueInCents, input.clientId, input.stage, timestamp, timestamp);
  return getDeal(db, Number(info.lastInsertRowid))!;
}

export interface UpdateDealInput {
  title?: string;
  valueInCents?: number;
  clientId?: number;
  stage?: Stage;
}

export function updateDeal(db: AppDatabase, id: number, input: UpdateDealInput): Deal {
  const current = getDealOrFail(db, id);
  const updatedAt = nextTimestamp(current.updatedAt);
  db.prepare(
    `UPDATE deals
        SET title = ?, valueInCents = ?, clientId = ?, stage = ?, updatedAt = ?
      WHERE id = ?`,
  ).run(
    input.title ?? current.title,
    input.valueInCents ?? current.valueInCents,
    input.clientId ?? current.clientId,
    input.stage ?? current.stage,
    updatedAt,
    id,
  );
  return getDeal(db, id)!;
}

export function deleteDeal(db: AppDatabase, id: number): void {
  getDealOrFail(db, id);
  db.prepare('DELETE FROM deals WHERE id = ?').run(id);
}

/* -------------------------------------------------------------------------- */
/* Indicadores                                                                */
/* -------------------------------------------------------------------------- */

export interface DashboardMetrics {
  totalClients: number;
  openDeals: number;
  pipelineValueInCents: number;
}

export function getDashboardMetrics(db: AppDatabase): DashboardMetrics {
  const totalClients = (
    db.prepare('SELECT COUNT(*) AS total FROM clients').get() as { total: number }
  ).total;
  const open = db
    .prepare(
      `SELECT COUNT(*) AS total, COALESCE(SUM(valueInCents), 0) AS value
         FROM deals WHERE stage <> 'won'`,
    )
    .get() as { total: number; value: number };

  return {
    totalClients,
    openDeals: open.total,
    pipelineValueInCents: open.value,
  };
}

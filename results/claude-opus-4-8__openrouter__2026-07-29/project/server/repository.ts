import { DB } from "./db";
import { Client, Deal, Paginated, Stage } from "./types";
import { ClientInput, DealInput } from "./validation";

export class ConflictError extends Error {
  status = 409;
}
export class NotFoundError extends Error {
  status = 404;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ---------------- Clients ----------------

export interface ClientListParams {
  search?: string;
  page: number;
  pageSize: number;
}

export function listClients(db: DB, params: ClientListParams): Paginated<Client> {
  const { search, page, pageSize } = params;
  const where: string[] = [];
  const args: any[] = [];
  if (search && search.trim().length > 0) {
    const like = `%${search.trim().toLowerCase()}%`;
    where.push(
      "(LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(IFNULL(company,'')) LIKE ?)"
    );
    args.push(like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM clients ${whereSql}`).get(...args) as any
  ).c as number;
  const offset = (page - 1) * pageSize;
  const data = db
    .prepare(
      `SELECT * FROM clients ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`
    )
    .all(...args, pageSize, offset) as Client[];
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export function getClient(db: DB, id: number): Client | undefined {
  return db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as Client | undefined;
}

function emailExists(db: DB, email: string, exceptId?: number): boolean {
  const row = db
    .prepare(
      `SELECT id FROM clients WHERE LOWER(email) = LOWER(?)${
        exceptId ? " AND id != ?" : ""
      }`
    )
    .get(...(exceptId ? [email, exceptId] : [email])) as any;
  return !!row;
}

export function createClient(db: DB, input: ClientInput): Client {
  if (emailExists(db, input.email)) {
    throw new ConflictError("Já existe um cliente com este e-mail.");
  }
  const ts = nowIso();
  const info = db
    .prepare(
      `INSERT INTO clients (name, email, company, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(input.name, input.email, input.company, ts, ts);
  return getClient(db, Number(info.lastInsertRowid))!;
}

export function updateClient(db: DB, id: number, patch: Partial<ClientInput>): Client {
  const existing = getClient(db, id);
  if (!existing) throw new NotFoundError("Cliente não encontrado.");
  if (patch.email !== undefined && emailExists(db, patch.email, id)) {
    throw new ConflictError("Já existe um cliente com este e-mail.");
  }
  const merged = {
    name: patch.name ?? existing.name,
    email: patch.email ?? existing.email,
    company: patch.company !== undefined ? patch.company : existing.company,
  };
  db.prepare(
    `UPDATE clients SET name = ?, email = ?, company = ?, updatedAt = ? WHERE id = ?`
  ).run(merged.name, merged.email, merged.company, nowIso(), id);
  return getClient(db, id)!;
}

export function deleteClient(db: DB, id: number): void {
  const existing = getClient(db, id);
  if (!existing) throw new NotFoundError("Cliente não encontrado.");
  const deals = (
    db.prepare("SELECT COUNT(*) AS c FROM deals WHERE clientId = ?").get(id) as any
  ).c as number;
  if (deals > 0) {
    throw new ConflictError(
      "Não é possível excluir um cliente que possui negócios relacionados."
    );
  }
  db.prepare("DELETE FROM clients WHERE id = ?").run(id);
}

// ---------------- Deals ----------------

export interface DealListParams {
  search?: string;
  stage?: string;
  clientId?: number;
  page: number;
  pageSize: number;
}

export function listDeals(db: DB, params: DealListParams): Paginated<Deal> {
  const { search, stage, clientId, page, pageSize } = params;
  const where: string[] = [];
  const args: any[] = [];
  if (search && search.trim().length > 0) {
    where.push("LOWER(title) LIKE ?");
    args.push(`%${search.trim().toLowerCase()}%`);
  }
  if (stage && stage.trim().length > 0) {
    where.push("stage = ?");
    args.push(stage);
  }
  if (clientId !== undefined && Number.isFinite(clientId)) {
    where.push("clientId = ?");
    args.push(clientId);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM deals ${whereSql}`).get(...args) as any
  ).c as number;
  const offset = (page - 1) * pageSize;
  const data = db
    .prepare(`SELECT * FROM deals ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...args, pageSize, offset) as Deal[];
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export function getDeal(db: DB, id: number): Deal | undefined {
  return db.prepare("SELECT * FROM deals WHERE id = ?").get(id) as Deal | undefined;
}

export function createDeal(db: DB, input: DealInput): Deal {
  const client = getClient(db, input.clientId);
  if (!client) {
    throw new NotFoundError("Cliente informado não existe.");
  }
  const ts = nowIso();
  const info = db
    .prepare(
      `INSERT INTO deals (title, valueInCents, clientId, stage, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(input.title, input.valueInCents, input.clientId, input.stage, ts, ts);
  return getDeal(db, Number(info.lastInsertRowid))!;
}

export function updateDeal(db: DB, id: number, patch: Partial<DealInput>): Deal {
  const existing = getDeal(db, id);
  if (!existing) throw new NotFoundError("Negócio não encontrado.");
  if (patch.clientId !== undefined && !getClient(db, patch.clientId)) {
    throw new NotFoundError("Cliente informado não existe.");
  }
  const merged = {
    title: patch.title ?? existing.title,
    valueInCents: patch.valueInCents ?? existing.valueInCents,
    clientId: patch.clientId ?? existing.clientId,
    stage: (patch.stage ?? existing.stage) as Stage,
  };
  db.prepare(
    `UPDATE deals SET title = ?, valueInCents = ?, clientId = ?, stage = ?, updatedAt = ?
     WHERE id = ?`
  ).run(
    merged.title,
    merged.valueInCents,
    merged.clientId,
    merged.stage,
    nowIso(),
    id
  );
  return getDeal(db, id)!;
}

export function deleteDeal(db: DB, id: number): void {
  const existing = getDeal(db, id);
  if (!existing) throw new NotFoundError("Negócio não encontrado.");
  db.prepare("DELETE FROM deals WHERE id = ?").run(id);
}

// ---------------- Dashboard ----------------

export function getDashboard(db: DB): {
  totalClients: number;
  openDeals: number;
  pipelineValueInCents: number;
} {
  const totalClients = (
    db.prepare("SELECT COUNT(*) AS c FROM clients").get() as any
  ).c as number;
  const open = db
    .prepare(
      "SELECT COUNT(*) AS c, IFNULL(SUM(valueInCents),0) AS v FROM deals WHERE stage != 'won'"
    )
    .get() as any;
  return {
    totalClients,
    openDeals: open.c as number,
    pipelineValueInCents: open.v as number,
  };
}

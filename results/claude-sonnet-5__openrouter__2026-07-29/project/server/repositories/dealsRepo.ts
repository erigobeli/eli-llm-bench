import { getDb } from "../db.js";
import type { Deal, DealStage, ListResult } from "../types.js";

interface DealRow {
  id: number;
  title: string;
  value_in_cents: number;
  client_id: number;
  stage: string;
  created_at: string;
  updated_at: string;
}

function rowToDeal(row: DealRow): Deal {
  return {
    id: row.id,
    title: row.title,
    valueInCents: row.value_in_cents,
    clientId: row.client_id,
    stage: row.stage as DealStage,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function findDealById(id: number): Deal | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM deals WHERE id = ?").get(id) as DealRow | undefined;
  return row ? rowToDeal(row) : null;
}

export function listDeals(params: {
  search?: string;
  stage?: DealStage;
  clientId?: number;
  page: number;
  pageSize: number;
}): ListResult<Deal> {
  const db = getDb();
  const { search, stage, clientId, page, pageSize } = params;

  const conditions: string[] = [];
  const args: unknown[] = [];

  if (search && search.trim().length > 0) {
    conditions.push("LOWER(title) LIKE ?");
    args.push(`%${search.trim().toLowerCase()}%`);
  }
  if (stage) {
    conditions.push("stage = ?");
    args.push(stage);
  }
  if (clientId !== undefined) {
    conditions.push("client_id = ?");
    args.push(clientId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const total = (
    db.prepare(`SELECT COUNT(*) as count FROM deals ${whereClause}`).get(...args) as { count: number }
  ).count;

  const offset = (page - 1) * pageSize;
  const rows = db
    .prepare(`SELECT * FROM deals ${whereClause} ORDER BY id ASC LIMIT ? OFFSET ?`)
    .all(...args, pageSize, offset) as DealRow[];

  return {
    data: rows.map(rowToDeal),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  };
}

export function createDeal(input: {
  title: string;
  valueInCents: number;
  clientId: number;
  stage: DealStage;
}): Deal {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO deals (title, value_in_cents, client_id, stage, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(input.title, input.valueInCents, input.clientId, input.stage, now, now);
  return findDealById(Number(result.lastInsertRowid)) as Deal;
}

export function updateDeal(
  id: number,
  input: { title?: string; valueInCents?: number; clientId?: number; stage?: DealStage }
): Deal | null {
  const db = getDb();
  const existing = findDealById(id);
  if (!existing) {
    return null;
  }

  const title = input.title !== undefined ? input.title : existing.title;
  const valueInCents = input.valueInCents !== undefined ? input.valueInCents : existing.valueInCents;
  const clientId = input.clientId !== undefined ? input.clientId : existing.clientId;
  const stage = input.stage !== undefined ? input.stage : existing.stage;
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE deals SET title = ?, value_in_cents = ?, client_id = ?, stage = ?, updated_at = ? WHERE id = ?`
  ).run(title, valueInCents, clientId, stage, now, id);

  return findDealById(id);
}

export function deleteDeal(id: number): boolean {
  const db = getDb();
  const existing = findDealById(id);
  if (!existing) {
    return false;
  }
  db.prepare("DELETE FROM deals WHERE id = ?").run(id);
  return true;
}

export function countOpenDealsAndPipelineValue(): { openDeals: number; pipelineValueInCents: number } {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT COUNT(*) as openDeals, COALESCE(SUM(value_in_cents), 0) as pipelineValueInCents
       FROM deals WHERE stage != 'won'`
    )
    .get() as { openDeals: number; pipelineValueInCents: number };
  return row;
}

export function clientHasDeals(clientId: number): boolean {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as count FROM deals WHERE client_id = ?").get(clientId) as {
    count: number;
  };
  return row.count > 0;
}

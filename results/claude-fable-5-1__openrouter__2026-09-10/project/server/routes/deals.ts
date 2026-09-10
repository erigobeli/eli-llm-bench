import { Router } from "express";
import type { DB } from "../db";
import type { Deal } from "../../shared/types";
import {
  badRequest,
  buildPagination,
  ensureObject,
  notFound,
  parseClientId,
  parseIdParam,
  parseOptionalClientId,
  parseOptionalStage,
  parsePaging,
  parseSearch,
  parseStage,
  parseTitle,
  parseValueInCents,
} from "../validation";

interface DealRow {
  id: number;
  title: string;
  value_in_cents: number;
  client_id: number;
  stage: Deal["stage"];
  created_at: string;
  updated_at: string;
}

function mapDeal(row: DealRow): Deal {
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

export function dealsRouter(db: DB): Router {
  const router = Router();

  const getById = db.prepare<[number], DealRow>("SELECT * FROM deals WHERE id = ?");
  const clientExists = db.prepare<[number], { id: number }>("SELECT id FROM clients WHERE id = ?");
  const insert = db.prepare(
    `INSERT INTO deals (title, value_in_cents, client_id, stage, created_at, updated_at)
     VALUES (@title, @valueInCents, @clientId, @stage, @now, @now)`,
  );
  const update = db.prepare(
    `UPDATE deals SET title = @title, value_in_cents = @valueInCents, client_id = @clientId,
     stage = @stage, updated_at = @now WHERE id = @id`,
  );
  const remove = db.prepare("DELETE FROM deals WHERE id = ?");

  router.get("/", (req, res) => {
    const query = req.query as Record<string, unknown>;
    const paging = parsePaging(query);
    const search = parseSearch(query);
    const stage = parseOptionalStage(query);
    const clientId = parseOptionalClientId(query);

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (search) {
      conditions.push("title LIKE ?");
      params.push(`%${search}%`);
    }
    if (stage) {
      conditions.push("stage = ?");
      params.push(stage);
    }
    if (clientId) {
      conditions.push("client_id = ?");
      params.push(clientId);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const total = (db.prepare(`SELECT COUNT(*) AS n FROM deals ${where}`).get(...params) as { n: number }).n;
    const rows = db
      .prepare(`SELECT * FROM deals ${where} ORDER BY id ASC LIMIT ? OFFSET ?`)
      .all(...params, paging.pageSize, paging.offset) as DealRow[];
    res.json({ data: rows.map(mapDeal), pagination: buildPagination(paging.page, paging.pageSize, total) });
  });

  router.get("/:id", (req, res) => {
    const id = parseIdParam(req.params.id, "Negócio");
    const row = getById.get(id);
    if (!row) throw notFound("Negócio não encontrado.");
    res.json(mapDeal(row));
  });

  router.post("/", (req, res) => {
    const body = ensureObject(req.body);
    const title = parseTitle(body.title);
    const valueInCents = parseValueInCents(body.valueInCents);
    const clientId = parseClientId(body.clientId);
    const stage = body.stage === undefined ? "new" : parseStage(body.stage);
    if (!clientExists.get(clientId)) throw badRequest("Cliente informado não existe.");
    const now = new Date().toISOString();
    const result = insert.run({ title, valueInCents, clientId, stage, now });
    res.status(201).json(mapDeal(getById.get(Number(result.lastInsertRowid))!));
  });

  router.patch("/:id", (req, res) => {
    const id = parseIdParam(req.params.id, "Negócio");
    const existing = getById.get(id);
    if (!existing) throw notFound("Negócio não encontrado.");
    const body = ensureObject(req.body);
    if (Object.keys(body).length === 0) throw badRequest("Informe ao menos um campo para atualizar.");

    const title = body.title !== undefined ? parseTitle(body.title) : existing.title;
    const valueInCents =
      body.valueInCents !== undefined ? parseValueInCents(body.valueInCents) : existing.value_in_cents;
    const clientId = body.clientId !== undefined ? parseClientId(body.clientId) : existing.client_id;
    const stage = body.stage !== undefined ? parseStage(body.stage) : existing.stage;
    if (clientId !== existing.client_id && !clientExists.get(clientId)) {
      throw badRequest("Cliente informado não existe.");
    }
    const now = new Date().toISOString();
    update.run({ id, title, valueInCents, clientId, stage, now });
    res.json(mapDeal(getById.get(id)!));
  });

  router.delete("/:id", (req, res) => {
    const id = parseIdParam(req.params.id, "Negócio");
    if (!getById.get(id)) throw notFound("Negócio não encontrado.");
    remove.run(id);
    res.status(204).end();
  });

  return router;
}

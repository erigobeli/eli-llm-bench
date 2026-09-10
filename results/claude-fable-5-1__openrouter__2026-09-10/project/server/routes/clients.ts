import { Router } from "express";
import type { DB } from "../db";
import type { Client } from "../../shared/types";
import {
  badRequest,
  buildPagination,
  conflict,
  ensureObject,
  notFound,
  parseCompany,
  parseEmail,
  parseIdParam,
  parseName,
  parsePaging,
  parseSearch,
} from "../validation";

interface ClientRow {
  id: number;
  name: string;
  email: string;
  company: string | null;
  created_at: string;
  updated_at: string;
}

function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function clientsRouter(db: DB): Router {
  const router = Router();

  const getById = db.prepare<[number], ClientRow>("SELECT * FROM clients WHERE id = ?");
  const emailTaken = db.prepare<[string, number], { id: number }>(
    "SELECT id FROM clients WHERE lower(email) = lower(?) AND id != ?",
  );
  const insert = db.prepare(
    `INSERT INTO clients (name, email, company, created_at, updated_at)
     VALUES (@name, @email, @company, @now, @now)`,
  );
  const update = db.prepare(
    `UPDATE clients SET name = @name, email = @email, company = @company, updated_at = @now WHERE id = @id`,
  );
  const remove = db.prepare("DELETE FROM clients WHERE id = ?");
  const countDeals = db.prepare<[number], { n: number }>(
    "SELECT COUNT(*) AS n FROM deals WHERE client_id = ?",
  );

  router.get("/", (req, res) => {
    const paging = parsePaging(req.query as Record<string, unknown>);
    const search = parseSearch(req.query as Record<string, unknown>);
    const params: unknown[] = [];
    let where = "";
    if (search) {
      where = "WHERE (name LIKE ? OR email LIKE ? OR company LIKE ?)";
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    const total = (db.prepare(`SELECT COUNT(*) AS n FROM clients ${where}`).get(...params) as { n: number }).n;
    const rows = db
      .prepare(`SELECT * FROM clients ${where} ORDER BY id ASC LIMIT ? OFFSET ?`)
      .all(...params, paging.pageSize, paging.offset) as ClientRow[];
    res.json({ data: rows.map(mapClient), pagination: buildPagination(paging.page, paging.pageSize, total) });
  });

  router.get("/:id", (req, res) => {
    const id = parseIdParam(req.params.id, "Cliente");
    const row = getById.get(id);
    if (!row) throw notFound("Cliente não encontrado.");
    res.json(mapClient(row));
  });

  router.post("/", (req, res) => {
    const body = ensureObject(req.body);
    const name = parseName(body.name);
    const email = parseEmail(body.email);
    const company = parseCompany(body.company);
    if (emailTaken.get(email, 0)) throw conflict("Já existe um cliente com este e-mail.");
    const now = new Date().toISOString();
    const result = insert.run({ name, email, company, now });
    const row = getById.get(Number(result.lastInsertRowid))!;
    res.status(201).json(mapClient(row));
  });

  router.patch("/:id", (req, res) => {
    const id = parseIdParam(req.params.id, "Cliente");
    const existing = getById.get(id);
    if (!existing) throw notFound("Cliente não encontrado.");
    const body = ensureObject(req.body);
    if (Object.keys(body).length === 0) throw badRequest("Informe ao menos um campo para atualizar.");

    const name = body.name !== undefined ? parseName(body.name) : existing.name;
    const email = body.email !== undefined ? parseEmail(body.email) : existing.email;
    const company = body.company !== undefined ? parseCompany(body.company) : existing.company;
    if (emailTaken.get(email, id)) throw conflict("Já existe um cliente com este e-mail.");

    const now = new Date().toISOString();
    update.run({ id, name, email, company, now });
    res.json(mapClient(getById.get(id)!));
  });

  router.delete("/:id", (req, res) => {
    const id = parseIdParam(req.params.id, "Cliente");
    const existing = getById.get(id);
    if (!existing) throw notFound("Cliente não encontrado.");
    if (countDeals.get(id)!.n > 0) {
      throw conflict("Cliente possui negócios relacionados e não pode ser excluído.");
    }
    remove.run(id);
    res.status(204).end();
  });

  return router;
}

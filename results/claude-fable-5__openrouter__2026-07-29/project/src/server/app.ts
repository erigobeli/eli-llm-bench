import express, { type Express, type Request, type Response, type NextFunction } from "express";
import type Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import {
  ValidationError,
  nowIso,
  parsePagination,
  validateClientIdValue,
  validateCompany,
  validateEmail,
  validateName,
  validateStage,
  validateTitle,
  validateValueInCents
} from "./validation.js";

interface ClientRow {
  id: number;
  name: string;
  email: string;
  company: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DealRow {
  id: number;
  title: string;
  valueInCents: number;
  clientId: number;
  stage: string;
  createdAt: string;
  updatedAt: string;
}

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

export function createApp(db: Database.Database, staticDir?: string): Express {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // ---------- Clientes ----------

  app.get("/api/clients", (req, res) => {
    const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const where: string[] = [];
    const params: Record<string, unknown> = {};
    if (search !== "") {
      where.push("(name LIKE @term OR email LIKE @term OR company LIKE @term)");
      params.term = `%${search}%`;
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const total = (
      db.prepare(`SELECT COUNT(*) AS c FROM clients ${whereSql}`).get(params) as { c: number }
    ).c;
    const data = db
      .prepare(
        `SELECT * FROM clients ${whereSql} ORDER BY id ASC LIMIT @limit OFFSET @offset`
      )
      .all({ ...params, limit: pageSize, offset: (page - 1) * pageSize }) as ClientRow[];

    res.json({
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  });

  app.post("/api/clients", (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = validateName(body.name);
    const email = validateEmail(body.email);
    const company = validateCompany(body.company);

    const existing = db
      .prepare("SELECT id FROM clients WHERE email = ? COLLATE NOCASE")
      .get(email);
    if (existing) {
      res.status(409).json({ error: "Já existe um cliente com este e-mail." });
      return;
    }

    const ts = nowIso();
    const info = db
      .prepare(
        `INSERT INTO clients (name, email, company, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(name, email, company, ts, ts);
    const client = db
      .prepare("SELECT * FROM clients WHERE id = ?")
      .get(info.lastInsertRowid) as ClientRow;
    res.status(201).json(client);
  });

  app.patch("/api/clients/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Identificador de cliente inválido." });
      return;
    }
    const current = db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as
      | ClientRow
      | undefined;
    if (!current) {
      res.status(404).json({ error: "Cliente não encontrado." });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const next: Partial<ClientRow> = {};
    if ("name" in body) next.name = validateName(body.name);
    if ("email" in body) next.email = validateEmail(body.email);
    if ("company" in body) next.company = validateCompany(body.company);

    if (next.email !== undefined) {
      const duplicate = db
        .prepare("SELECT id FROM clients WHERE email = ? COLLATE NOCASE AND id != ?")
        .get(next.email, id);
      if (duplicate) {
        res.status(409).json({ error: "Já existe um cliente com este e-mail." });
        return;
      }
    }

    db.prepare(
      `UPDATE clients SET name = @name, email = @email, company = @company, updatedAt = @updatedAt
       WHERE id = @id`
    ).run({
      id,
      name: next.name ?? current.name,
      email: next.email ?? current.email,
      company: "company" in body ? next.company : current.company,
      updatedAt: nowIso()
    });

    const updated = db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as ClientRow;
    res.status(200).json(updated);
  });

  app.delete("/api/clients/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Identificador de cliente inválido." });
      return;
    }
    const current = db.prepare("SELECT id FROM clients WHERE id = ?").get(id);
    if (!current) {
      res.status(404).json({ error: "Cliente não encontrado." });
      return;
    }
    const hasDeals = db
      .prepare("SELECT COUNT(*) AS c FROM deals WHERE clientId = ?")
      .get(id) as { c: number };
    if (hasDeals.c > 0) {
      res.status(409).json({
        error: "Este cliente possui negócios relacionados e não pode ser excluído."
      });
      return;
    }
    db.prepare("DELETE FROM clients WHERE id = ?").run(id);
    res.status(204).end();
  });

  // ---------- Negócios ----------

  app.get("/api/deals", (req, res) => {
    const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const where: string[] = [];
    const params: Record<string, unknown> = {};
    if (search !== "") {
      where.push("title LIKE @term");
      params.term = `%${search}%`;
    }
    if (req.query.stage !== undefined) {
      const stage = validateStage(req.query.stage);
      where.push("stage = @stage");
      params.stage = stage;
    }
    if (req.query.clientId !== undefined) {
      const clientId = Number(req.query.clientId);
      if (!Number.isInteger(clientId) || clientId < 1) {
        res.status(400).json({ error: "O parâmetro clientId é inválido." });
        return;
      }
      where.push("clientId = @clientId");
      params.clientId = clientId;
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const total = (
      db.prepare(`SELECT COUNT(*) AS c FROM deals ${whereSql}`).get(params) as { c: number }
    ).c;
    const data = db
      .prepare(`SELECT * FROM deals ${whereSql} ORDER BY id ASC LIMIT @limit OFFSET @offset`)
      .all({ ...params, limit: pageSize, offset: (page - 1) * pageSize }) as DealRow[];

    res.json({
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  });

  app.post("/api/deals", (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const title = validateTitle(body.title);
    const valueInCents = validateValueInCents(body.valueInCents);
    const clientId = validateClientIdValue(body.clientId);
    const stage = validateStage(body.stage);

    const client = db.prepare("SELECT id FROM clients WHERE id = ?").get(clientId);
    if (!client) {
      res.status(400).json({ error: "O cliente informado não existe." });
      return;
    }

    const ts = nowIso();
    const info = db
      .prepare(
        `INSERT INTO deals (title, valueInCents, clientId, stage, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(title, valueInCents, clientId, stage, ts, ts);
    const deal = db
      .prepare("SELECT * FROM deals WHERE id = ?")
      .get(info.lastInsertRowid) as DealRow;
    res.status(201).json(deal);
  });

  app.patch("/api/deals/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Identificador de negócio inválido." });
      return;
    }
    const current = db.prepare("SELECT * FROM deals WHERE id = ?").get(id) as
      | DealRow
      | undefined;
    if (!current) {
      res.status(404).json({ error: "Negócio não encontrado." });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const next: Partial<DealRow> = {};
    if ("title" in body) next.title = validateTitle(body.title);
    if ("valueInCents" in body) next.valueInCents = validateValueInCents(body.valueInCents);
    if ("stage" in body) next.stage = validateStage(body.stage);
    if ("clientId" in body) {
      const clientId = validateClientIdValue(body.clientId);
      const client = db.prepare("SELECT id FROM clients WHERE id = ?").get(clientId);
      if (!client) {
        res.status(400).json({ error: "O cliente informado não existe." });
        return;
      }
      next.clientId = clientId;
    }

    db.prepare(
      `UPDATE deals SET title = @title, valueInCents = @valueInCents, clientId = @clientId,
        stage = @stage, updatedAt = @updatedAt WHERE id = @id`
    ).run({
      id,
      title: next.title ?? current.title,
      valueInCents: next.valueInCents ?? current.valueInCents,
      clientId: next.clientId ?? current.clientId,
      stage: next.stage ?? current.stage,
      updatedAt: nowIso()
    });

    const updated = db.prepare("SELECT * FROM deals WHERE id = ?").get(id) as DealRow;
    res.status(200).json(updated);
  });

  app.delete("/api/deals/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Identificador de negócio inválido." });
      return;
    }
    const current = db.prepare("SELECT id FROM deals WHERE id = ?").get(id);
    if (!current) {
      res.status(404).json({ error: "Negócio não encontrado." });
      return;
    }
    db.prepare("DELETE FROM deals WHERE id = ?").run(id);
    res.status(204).end();
  });

  // ---------- Indicadores ----------

  app.get("/api/dashboard", (_req, res) => {
    const totalClients = (
      db.prepare("SELECT COUNT(*) AS c FROM clients").get() as { c: number }
    ).c;
    const open = db
      .prepare(
        "SELECT COUNT(*) AS c, COALESCE(SUM(valueInCents), 0) AS v FROM deals WHERE stage != 'won'"
      )
      .get() as { c: number; v: number };
    res.json({
      totalClients,
      openDeals: open.c,
      pipelineValueInCents: open.v
    });
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Rota não encontrada." });
  });

  // ---------- Frontend estático ----------

  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api/")) {
        next();
        return;
      }
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }

  // ---------- Erros ----------

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (
      err instanceof SyntaxError &&
      "status" in (err as object) &&
      (err as { status?: number }).status === 400
    ) {
      res.status(400).json({ error: "O corpo da requisição não é um JSON válido." });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Erro interno do servidor." });
  });

  return app;
}

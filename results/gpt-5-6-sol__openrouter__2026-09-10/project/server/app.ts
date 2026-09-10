import express, { type ErrorRequestHandler, type Request, type Response } from "express";
import path from "node:path";
import type { AppDatabase } from "./db.js";
import type { Client, Deal } from "./types.js";
import { stages } from "./types.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function integer(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function idFrom(req: Request) {
  const id = integer(req.params.id);
  if (id === null || id < 1) throw new ApiError(400, "Identificador inválido.");
  return id;
}

function pagination(req: Request) {
  const page = req.query.page === undefined ? 1 : integer(req.query.page);
  const pageSize = req.query.pageSize === undefined ? 10 : integer(req.query.pageSize);
  if (page === null || page < 1) throw new ApiError(400, "A página deve ser um inteiro a partir de 1.");
  if (pageSize === null || pageSize < 1 || pageSize > 50) throw new ApiError(400, "O tamanho da página deve ser um inteiro entre 1 e 50.");
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function text(value: unknown, field: string, min: number, max: number) {
  if (typeof value !== "string") throw new ApiError(400, `${field} é obrigatório.`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) throw new ApiError(400, `${field} deve ter entre ${min} e ${max} caracteres.`);
  return trimmed;
}

function validateClient(body: Record<string, unknown>, partial = false) {
  const result: Record<string, string | null> = {};
  if (!partial || "name" in body) result.name = text(body.name, "Nome", 2, 80);
  if (!partial || "email" in body) {
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!emailPattern.test(email)) throw new ApiError(400, "Informe um e-mail válido.");
    result.email = email;
  }
  if ("company" in body) {
    if (body.company === null || body.company === "") result.company = null;
    else if (typeof body.company !== "string") throw new ApiError(400, "Empresa inválida.");
    else result.company = body.company.trim() || null;
  } else if (!partial) result.company = null;
  if (partial && Object.keys(result).length === 0) throw new ApiError(400, "Informe ao menos um campo para atualizar.");
  return result;
}

function validateDeal(db: AppDatabase, body: Record<string, unknown>, partial = false) {
  const result: Record<string, string | number> = {};
  if (!partial || "title" in body) result.title = text(body.title, "Título", 2, 120);
  if (!partial || "valueInCents" in body) {
    const value = integer(body.valueInCents);
    if (value === null || value < 0) throw new ApiError(400, "O valor deve ser um inteiro maior ou igual a zero.");
    result.valueInCents = value;
  }
  if (!partial || "clientId" in body) {
    const clientId = integer(body.clientId);
    if (clientId === null || clientId < 1 || !db.prepare("SELECT 1 FROM clients WHERE id = ?").get(clientId)) throw new ApiError(400, "Cliente inválido.");
    result.clientId = clientId;
  }
  if (!partial || "stage" in body) {
    if (typeof body.stage !== "string" || !stages.includes(body.stage as (typeof stages)[number])) throw new ApiError(400, "Etapa inválida.");
    result.stage = body.stage;
  }
  if (partial && Object.keys(result).length === 0) throw new ApiError(400, "Informe ao menos um campo para atualizar.");
  return result;
}

function sendPage(res: Response, data: unknown[], page: number, pageSize: number, total: number) {
  res.json({ data, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
}

export function createApp(db: AppDatabase, clientDir = path.resolve("dist/client")) {
  const casefold = (value: unknown) => typeof value === "string" ? value.toLocaleLowerCase("pt-BR") : "";
  const searchPattern = (value: string) => `%${casefold(value).replace(/[\\%_]/g, "\\$&")}%`;
  db.function("casefold", { deterministic: true }, casefold);
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  app.get("/api/clients", (req, res) => {
    const { page, pageSize, offset } = pagination(req);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const where = search ? "WHERE casefold(name) LIKE @term ESCAPE '\\' OR casefold(email) LIKE @term ESCAPE '\\' OR casefold(COALESCE(company, '')) LIKE @term ESCAPE '\\'" : "";
    const params = { term: searchPattern(search), pageSize, offset };
    const total = (db.prepare(`SELECT COUNT(*) AS count FROM clients ${where}`).get(params) as { count: number }).count;
    const data = db.prepare(`SELECT * FROM clients ${where} ORDER BY id DESC LIMIT @pageSize OFFSET @offset`).all(params);
    sendPage(res, data, page, pageSize, total);
  });

  app.post("/api/clients", (req, res) => {
    const data = validateClient(req.body ?? {});
    const now = new Date().toISOString();
    try {
      const info = db.prepare("INSERT INTO clients (name, email, company, createdAt, updatedAt) VALUES (@name, @email, @company, @createdAt, @updatedAt)").run({ ...data, createdAt: now, updatedAt: now });
      res.status(201).json(db.prepare("SELECT * FROM clients WHERE id = ?").get(info.lastInsertRowid));
    } catch (error) {
      if (String(error).includes("UNIQUE")) throw new ApiError(409, "Já existe um cliente com este e-mail.");
      throw error;
    }
  });

  app.patch("/api/clients/:id", (req, res) => {
    const id = idFrom(req);
    const existing = db.prepare("SELECT updatedAt FROM clients WHERE id = ?").get(id) as { updatedAt: string } | undefined;
    if (!existing) throw new ApiError(404, "Cliente não encontrado.");
    const data = validateClient(req.body ?? {}, true);
    const assignments = Object.keys(data).map((key) => `${key} = @${key}`).join(", ");
    try {
      const updatedAt = new Date(Math.max(Date.now(), Date.parse(existing.updatedAt) + 1)).toISOString();
      db.prepare(`UPDATE clients SET ${assignments}, updatedAt = @updatedAt WHERE id = @id`).run({ ...data, updatedAt, id });
      res.json(db.prepare("SELECT * FROM clients WHERE id = ?").get(id));
    } catch (error) {
      if (String(error).includes("UNIQUE")) throw new ApiError(409, "Já existe um cliente com este e-mail.");
      throw error;
    }
  });

  app.delete("/api/clients/:id", (req, res) => {
    const id = idFrom(req);
    if (!db.prepare("SELECT 1 FROM clients WHERE id = ?").get(id)) throw new ApiError(404, "Cliente não encontrado.");
    if (db.prepare("SELECT 1 FROM deals WHERE clientId = ? LIMIT 1").get(id)) throw new ApiError(409, "O cliente possui negócios relacionados e não pode ser excluído.");
    db.prepare("DELETE FROM clients WHERE id = ?").run(id);
    res.status(204).end();
  });

  app.get("/api/deals", (req, res) => {
    const { page, pageSize, offset } = pagination(req);
    const conditions: string[] = [];
    const params: Record<string, string | number> = { pageSize, offset };
    if (typeof req.query.search === "string" && req.query.search.trim()) { conditions.push("casefold(d.title) LIKE @term ESCAPE '\\'"); params.term = searchPattern(req.query.search.trim()); }
    if (req.query.stage !== undefined) {
      if (typeof req.query.stage !== "string" || !stages.includes(req.query.stage as (typeof stages)[number])) throw new ApiError(400, "Etapa inválida.");
      conditions.push("d.stage = @stage"); params.stage = req.query.stage;
    }
    if (req.query.clientId !== undefined) {
      const clientId = integer(req.query.clientId);
      if (clientId === null || clientId < 1) throw new ApiError(400, "Cliente inválido.");
      conditions.push("d.clientId = @clientId"); params.clientId = clientId;
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const total = (db.prepare(`SELECT COUNT(*) AS count FROM deals d ${where}`).get(params) as { count: number }).count;
    const data = db.prepare(`SELECT d.*, c.name AS clientName FROM deals d JOIN clients c ON c.id = d.clientId ${where} ORDER BY d.id DESC LIMIT @pageSize OFFSET @offset`).all(params);
    sendPage(res, data, page, pageSize, total);
  });

  app.post("/api/deals", (req, res) => {
    const data = validateDeal(db, req.body ?? {});
    const now = new Date().toISOString();
    const info = db.prepare("INSERT INTO deals (title, valueInCents, clientId, stage, createdAt, updatedAt) VALUES (@title, @valueInCents, @clientId, @stage, @createdAt, @updatedAt)").run({ ...data, createdAt: now, updatedAt: now });
    res.status(201).json(db.prepare("SELECT * FROM deals WHERE id = ?").get(info.lastInsertRowid));
  });

  app.patch("/api/deals/:id", (req, res) => {
    const id = idFrom(req);
    const existing = db.prepare("SELECT updatedAt FROM deals WHERE id = ?").get(id) as { updatedAt: string } | undefined;
    if (!existing) throw new ApiError(404, "Negócio não encontrado.");
    const data = validateDeal(db, req.body ?? {}, true);
    const assignments = Object.keys(data).map((key) => `${key} = @${key}`).join(", ");
    const updatedAt = new Date(Math.max(Date.now(), Date.parse(existing.updatedAt) + 1)).toISOString();
    db.prepare(`UPDATE deals SET ${assignments}, updatedAt = @updatedAt WHERE id = @id`).run({ ...data, updatedAt, id });
    res.json(db.prepare("SELECT * FROM deals WHERE id = ?").get(id));
  });

  app.delete("/api/deals/:id", (req, res) => {
    const id = idFrom(req);
    const result = db.prepare("DELETE FROM deals WHERE id = ?").run(id);
    if (!result.changes) throw new ApiError(404, "Negócio não encontrado.");
    res.status(204).end();
  });

  app.get("/api/dashboard", (_req, res) => {
    const totalClients = (db.prepare("SELECT COUNT(*) AS count FROM clients").get() as { count: number }).count;
    const totals = db.prepare("SELECT COUNT(*) AS count, COALESCE(SUM(valueInCents), 0) AS value FROM deals WHERE stage != 'won'").get() as { count: number; value: number };
    res.json({ totalClients, openDeals: totals.count, pipelineValueInCents: totals.value });
  });

  app.use(express.static(clientDir));
  app.get("/{*path}", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(clientDir, "index.html"));
  });

  app.use(((err, _req, res, _next) => {
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
    if (err instanceof SyntaxError) return res.status(400).json({ error: "JSON inválido." });
    console.error(err);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }) as ErrorRequestHandler);
  return app;
}

import express, { type NextFunction, type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import type { DB } from "./db.js";

export const STAGES = ["new", "contact", "proposal", "won"] as const;
export type Stage = (typeof STAGES)[number];

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const bad = (msg: string) => new HttpError(400, msg);

interface ClientRow {
  id: number;
  name: string;
  email: string;
  company: string | null;
  created_at: string;
  updated_at: string;
}

interface DealRow {
  id: number;
  title: string;
  value_in_cents: number;
  client_id: number;
  stage: Stage;
  created_at: string;
  updated_at: string;
}

const mapClient = (r: ClientRow) => ({
  id: r.id,
  name: r.name,
  email: r.email,
  company: r.company ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const mapDeal = (r: DealRow) => ({
  id: r.id,
  title: r.title,
  valueInCents: r.value_in_cents,
  clientId: r.client_id,
  stage: r.stage,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function nowIso(previous?: string): string {
  let now = new Date().toISOString();
  // Garante que updatedAt sempre avance, mesmo em atualizações no mesmo milissegundo.
  if (previous && now <= previous) {
    now = new Date(new Date(previous).getTime() + 1).toISOString();
  }
  return now;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function requireBody(req: Request): Record<string, unknown> {
  if (!isPlainObject(req.body)) throw bad("O corpo da requisição deve ser um objeto JSON.");
  return req.body;
}

function validName(v: unknown): string {
  if (typeof v !== "string") throw bad("O nome é obrigatório.");
  const s = v.trim();
  if (s.length < 2 || s.length > 80) throw bad("O nome deve ter entre 2 e 80 caracteres.");
  return s;
}

function validEmail(v: unknown): string {
  if (typeof v !== "string" || !v.trim()) throw bad("O e-mail é obrigatório.");
  const s = v.trim();
  if (s.length > 254 || !EMAIL_RE.test(s)) throw bad("Informe um e-mail válido.");
  return s;
}

function validCompany(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") throw bad("A empresa deve ser um texto.");
  const s = v.trim();
  if (s.length > 120) throw bad("A empresa deve ter no máximo 120 caracteres.");
  return s === "" ? null : s;
}

function validTitle(v: unknown): string {
  if (typeof v !== "string") throw bad("O título é obrigatório.");
  const s = v.trim();
  if (s.length < 2 || s.length > 120) throw bad("O título deve ter entre 2 e 120 caracteres.");
  return s;
}

function validValue(v: unknown): number {
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0) {
    throw bad("O valor deve ser um número inteiro de centavos maior ou igual a zero.");
  }
  return v;
}

function validStage(v: unknown): Stage {
  if (typeof v !== "string" || !STAGES.includes(v as Stage)) {
    throw bad("Etapa inválida. Use new, contact, proposal ou won.");
  }
  return v as Stage;
}

function parseId(raw: unknown, label = "Identificador"): number {
  const s = String(raw ?? "");
  if (!/^\d+$/.test(s)) throw bad(`${label} inválido.`);
  const n = Number(s);
  if (!Number.isSafeInteger(n) || n < 1) throw bad(`${label} inválido.`);
  return n;
}

function queryString(v: unknown): string | undefined {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) v = v[0];
  return typeof v === "string" ? v : undefined;
}

function parsePagination(q: Request["query"]) {
  const rawPage = queryString(q.page);
  const rawSize = queryString(q.pageSize);
  let page = 1;
  let pageSize = 10;
  if (rawPage !== undefined && rawPage !== "") {
    if (!/^\d+$/.test(rawPage) || Number(rawPage) < 1) {
      throw bad("O parâmetro page deve ser um inteiro maior ou igual a 1.");
    }
    page = Number(rawPage);
  }
  if (rawSize !== undefined && rawSize !== "") {
    if (!/^\d+$/.test(rawSize) || Number(rawSize) < 1 || Number(rawSize) > 50) {
      throw bad("O parâmetro pageSize deve ser um inteiro entre 1 e 50.");
    }
    pageSize = Number(rawSize);
  }
  return { page, pageSize };
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => "\\" + m);
}

function clientExists(db: DB, id: number): boolean {
  return !!db.prepare("SELECT 1 FROM clients WHERE id = ?").get(id);
}

function emailTaken(db: DB, email: string, exceptId?: number): boolean {
  const row = db
    .prepare("SELECT id FROM clients WHERE lower(email) = lower(?) AND id <> ?")
    .get(email, exceptId ?? -1);
  return !!row;
}

export function createApiRouter(db: DB): express.Router {
  const r = express.Router();

  r.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // ---------- Clientes ----------
  r.get("/clients", (req, res) => {
    const { page, pageSize } = parsePagination(req.query);
    const search = (queryString(req.query.search) ?? "").trim();
    const where: string[] = [];
    const params: unknown[] = [];
    if (search) {
      const like = `%${escapeLike(search.toLowerCase())}%`;
      where.push(
        "(lower(name) LIKE ? ESCAPE '\\' OR lower(email) LIKE ? ESCAPE '\\' OR lower(coalesce(company,'')) LIKE ? ESCAPE '\\')",
      );
      params.push(like, like, like);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const total = (db.prepare(`SELECT count(*) AS n FROM clients ${whereSql}`).get(...params) as { n: number }).n;
    const rows = db
      .prepare(`SELECT * FROM clients ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
      .all(...params, pageSize, (page - 1) * pageSize) as ClientRow[];
    res.json({
      data: rows.map(mapClient),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  });

  r.get("/clients/:id", (req, res) => {
    const id = parseId(req.params.id);
    const row = db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as ClientRow | undefined;
    if (!row) throw new HttpError(404, "Cliente não encontrado.");
    res.json(mapClient(row));
  });

  r.post("/clients", (req, res) => {
    const body = requireBody(req);
    const name = validName(body.name);
    const email = validEmail(body.email);
    const company = validCompany(body.company);
    if (emailTaken(db, email)) throw new HttpError(409, "Já existe um cliente com este e-mail.");
    const now = nowIso();
    const info = db
      .prepare("INSERT INTO clients (name, email, company, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .run(name, email, company, now, now);
    const row = db.prepare("SELECT * FROM clients WHERE id = ?").get(info.lastInsertRowid) as ClientRow;
    res.status(201).json(mapClient(row));
  });

  r.patch("/clients/:id", (req, res) => {
    const id = parseId(req.params.id);
    const body = requireBody(req);
    const current = db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as ClientRow | undefined;
    if (!current) throw new HttpError(404, "Cliente não encontrado.");
    const name = "name" in body ? validName(body.name) : current.name;
    const email = "email" in body ? validEmail(body.email) : current.email;
    const company = "company" in body ? validCompany(body.company) : current.company;
    if (emailTaken(db, email, id)) throw new HttpError(409, "Já existe um cliente com este e-mail.");
    const now = nowIso(current.updated_at);
    db.prepare("UPDATE clients SET name = ?, email = ?, company = ?, updated_at = ? WHERE id = ?").run(
      name,
      email,
      company,
      now,
      id,
    );
    const row = db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as ClientRow;
    res.status(200).json(mapClient(row));
  });

  r.delete("/clients/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (!clientExists(db, id)) throw new HttpError(404, "Cliente não encontrado.");
    const related = (db.prepare("SELECT count(*) AS n FROM deals WHERE client_id = ?").get(id) as { n: number }).n;
    if (related > 0) {
      throw new HttpError(409, "Não é possível excluir um cliente com negócios relacionados.");
    }
    db.prepare("DELETE FROM clients WHERE id = ?").run(id);
    res.status(204).end();
  });

  // ---------- Negócios ----------
  r.get("/deals", (req, res) => {
    const { page, pageSize } = parsePagination(req.query);
    const search = (queryString(req.query.search) ?? "").trim();
    const stage = queryString(req.query.stage);
    const clientIdRaw = queryString(req.query.clientId);
    const where: string[] = [];
    const params: unknown[] = [];
    if (search) {
      where.push("lower(title) LIKE ? ESCAPE '\\'");
      params.push(`%${escapeLike(search.toLowerCase())}%`);
    }
    if (stage !== undefined && stage !== "") {
      where.push("stage = ?");
      params.push(validStage(stage));
    }
    if (clientIdRaw !== undefined && clientIdRaw !== "") {
      where.push("client_id = ?");
      params.push(parseId(clientIdRaw, "Cliente"));
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const total = (db.prepare(`SELECT count(*) AS n FROM deals ${whereSql}`).get(...params) as { n: number }).n;
    const rows = db
      .prepare(`SELECT * FROM deals ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
      .all(...params, pageSize, (page - 1) * pageSize) as DealRow[];
    res.json({
      data: rows.map(mapDeal),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  });

  r.get("/deals/:id", (req, res) => {
    const id = parseId(req.params.id);
    const row = db.prepare("SELECT * FROM deals WHERE id = ?").get(id) as DealRow | undefined;
    if (!row) throw new HttpError(404, "Negócio não encontrado.");
    res.json(mapDeal(row));
  });

  r.post("/deals", (req, res) => {
    const body = requireBody(req);
    const title = validTitle(body.title);
    const value = validValue(body.valueInCents);
    const stage = body.stage === undefined ? "new" : validStage(body.stage);
    if (typeof body.clientId !== "number" || !Number.isSafeInteger(body.clientId) || body.clientId < 1) {
      throw bad("Informe um cliente válido.");
    }
    const clientId = body.clientId;
    if (!clientExists(db, clientId)) throw bad("O cliente informado não existe.");
    const now = nowIso();
    const info = db
      .prepare(
        "INSERT INTO deals (title, value_in_cents, client_id, stage, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(title, value, clientId, stage, now, now);
    const row = db.prepare("SELECT * FROM deals WHERE id = ?").get(info.lastInsertRowid) as DealRow;
    res.status(201).json(mapDeal(row));
  });

  r.patch("/deals/:id", (req, res) => {
    const id = parseId(req.params.id);
    const body = requireBody(req);
    const current = db.prepare("SELECT * FROM deals WHERE id = ?").get(id) as DealRow | undefined;
    if (!current) throw new HttpError(404, "Negócio não encontrado.");
    const title = "title" in body ? validTitle(body.title) : current.title;
    const value = "valueInCents" in body ? validValue(body.valueInCents) : current.value_in_cents;
    const stage = "stage" in body ? validStage(body.stage) : current.stage;
    let clientId = current.client_id;
    if ("clientId" in body) {
      if (typeof body.clientId !== "number" || !Number.isSafeInteger(body.clientId) || body.clientId < 1) {
        throw bad("Informe um cliente válido.");
      }
      if (!clientExists(db, body.clientId)) throw bad("O cliente informado não existe.");
      clientId = body.clientId;
    }
    const now = nowIso(current.updated_at);
    db.prepare(
      "UPDATE deals SET title = ?, value_in_cents = ?, client_id = ?, stage = ?, updated_at = ? WHERE id = ?",
    ).run(title, value, clientId, stage, now, id);
    const row = db.prepare("SELECT * FROM deals WHERE id = ?").get(id) as DealRow;
    res.status(200).json(mapDeal(row));
  });

  r.delete("/deals/:id", (req, res) => {
    const id = parseId(req.params.id);
    const info = db.prepare("DELETE FROM deals WHERE id = ?").run(id);
    if (info.changes === 0) throw new HttpError(404, "Negócio não encontrado.");
    res.status(204).end();
  });

  // ---------- Indicadores ----------
  r.get("/dashboard", (_req, res) => {
    const totalClients = (db.prepare("SELECT count(*) AS n FROM clients").get() as { n: number }).n;
    const open = db
      .prepare("SELECT count(*) AS n, coalesce(sum(value_in_cents), 0) AS v FROM deals WHERE stage <> 'won'")
      .get() as { n: number; v: number };
    res.json({ totalClients, openDeals: open.n, pipelineValueInCents: open.v });
  });

  r.use((_req, _res) => {
    throw new HttpError(404, "Rota não encontrada.");
  });

  return r;
}

export function createApp(db: DB, options: { clientDir?: string } = {}): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.use("/api", express.json({ limit: "100kb" }));
  app.use("/api", createApiRouter(db));

  const clientDir = options.clientDir;
  if (clientDir && fs.existsSync(path.join(clientDir, "index.html"))) {
    app.use(express.static(clientDir, { index: false }));
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      res.sendFile(path.join(clientDir, "index.html"));
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    const e = err as { type?: string; status?: number; code?: string };
    if (e?.type === "entity.parse.failed") {
      res.status(400).json({ error: "JSON inválido no corpo da requisição." });
      return;
    }
    if (e?.type === "entity.too.large") {
      res.status(413).json({ error: "Corpo da requisição muito grande." });
      return;
    }
    if (typeof e?.code === "string" && e.code.startsWith("SQLITE_CONSTRAINT")) {
      res.status(409).json({ error: "Conflito de integridade dos dados." });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Erro interno do servidor." });
  });

  if (!clientDir) {
    app.use((_req: Request, res: Response) => {
      res.status(404).json({ error: "Rota não encontrada." });
    });
  }

  return app;
}

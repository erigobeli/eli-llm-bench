import express, { Request, Response, NextFunction } from "express";
import path from "node:path";
import fs from "node:fs";
import { DB } from "./db";
import {
  parsePagination,
  validateClientCreate,
  validateClientPatch,
  validateDealCreate,
  validateDealPatch,
  ValidationError,
} from "./validation";
import {
  ConflictError,
  NotFoundError,
  createClient,
  createDeal,
  deleteClient,
  deleteDeal,
  getDashboard,
  listClients,
  listDeals,
  updateClient,
  updateDeal,
} from "./repository";

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError("Identificador inválido.");
  }
  return id;
}

export function createApp(db: DB): express.Express {
  const app = express();
  app.use(express.json());

  const api = express.Router();

  api.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  api.get("/dashboard", (_req, res) => {
    res.json(getDashboard(db));
  });

  // -------- Clients --------
  api.get("/clients", (req, res) => {
    const { page, pageSize } = parsePagination(req.query);
    const search = req.query.search ? String(req.query.search) : undefined;
    res.json(listClients(db, { search, page, pageSize }));
  });

  api.post("/clients", (req, res) => {
    const input = validateClientCreate(req.body);
    res.status(201).json(createClient(db, input));
  });

  api.patch("/clients/:id", (req, res) => {
    const id = parseId(req.params.id);
    const patch = validateClientPatch(req.body);
    res.status(200).json(updateClient(db, id, patch));
  });

  api.delete("/clients/:id", (req, res) => {
    const id = parseId(req.params.id);
    deleteClient(db, id);
    res.status(204).end();
  });

  // -------- Deals --------
  api.get("/deals", (req, res) => {
    const { page, pageSize } = parsePagination(req.query);
    const search = req.query.search ? String(req.query.search) : undefined;
    const stage = req.query.stage ? String(req.query.stage) : undefined;
    const clientId = req.query.clientId ? Number(req.query.clientId) : undefined;
    res.json(listDeals(db, { search, stage, clientId, page, pageSize }));
  });

  api.post("/deals", (req, res) => {
    const input = validateDealCreate(req.body);
    res.status(201).json(createDeal(db, input));
  });

  api.patch("/deals/:id", (req, res) => {
    const id = parseId(req.params.id);
    const patch = validateDealPatch(req.body);
    res.status(200).json(updateDeal(db, id, patch));
  });

  api.delete("/deals/:id", (req, res) => {
    const id = parseId(req.params.id);
    deleteDeal(db, id);
    res.status(204).end();
  });

  app.use("/api", api);

  // -------- Error handler for API --------
  app.use("/api", (err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status =
      err instanceof ValidationError ||
      err instanceof ConflictError ||
      err instanceof NotFoundError
        ? (err as any).status
        : err?.status ?? 500;
    const message =
      typeof err?.message === "string" && status !== 500
        ? err.message
        : "Erro interno do servidor.";
    if (status === 500) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
    res.status(status).json({ error: message });
  });

  // -------- Static frontend (production) --------
  const clientDir = path.resolve(__dirname, "../client");
  if (fs.existsSync(clientDir)) {
    app.use(express.static(clientDir));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(clientDir, "index.html"));
    });
  }

  return app;
}

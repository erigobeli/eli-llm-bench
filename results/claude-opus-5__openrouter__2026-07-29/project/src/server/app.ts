import fs from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import type { Db } from "./db";
import { STAGES, type Stage } from "./domain";
import { Repository } from "./repository";
import {
  HttpError,
  badRequest,
  conflict,
  hasKey,
  notFound,
  parseClientId,
  parseCompany,
  parseEmail,
  parseName,
  parsePageQuery,
  parseRouteId,
  parseSearch,
  parseStage,
  parseTitle,
  parseValueInCents,
  requireBody,
} from "./validation";

export interface AppOptions {
  /** Absolute path of the built frontend (dist/web). Omit to skip static hosting. */
  webRoot?: string | null;
}

function asyncRoute(
  handler: (req: Request, res: Response) => void,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    try {
      handler(req, res);
    } catch (error) {
      next(error);
    }
  };
}

function queryRecord(req: Request): Record<string, unknown> {
  return req.query as unknown as Record<string, unknown>;
}

export function createApp(db: Db, options: AppOptions = {}) {
  const repo = new Repository(db);
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  const api = express.Router();

  api.get(
    "/health",
    asyncRoute((_req, res) => {
      res.status(200).json({ status: "ok" });
    }),
  );

  api.get(
    "/dashboard",
    asyncRoute((_req, res) => {
      res.status(200).json(repo.dashboard());
    }),
  );

  /* ----------------------------- clients ----------------------------- */

  api.get(
    "/clients",
    asyncRoute((req, res) => {
      const query = queryRecord(req);
      const { page, pageSize } = parsePageQuery(query);
      const search = parseSearch(query.search);
      res.status(200).json(repo.listClients({ search, page, pageSize }));
    }),
  );

  api.get(
    "/clients/:id",
    asyncRoute((req, res) => {
      const id = parseRouteId(req.params.id);
      const client = repo.getClient(id);
      if (!client) {
        throw notFound("Cliente não encontrado.");
      }
      res.status(200).json(client);
    }),
  );

  api.post(
    "/clients",
    asyncRoute((req, res) => {
      const body = requireBody(req.body);
      const name = parseName(body.name);
      const email = parseEmail(body.email);
      const company = parseCompany(body.company);

      if (repo.findClientByEmail(email)) {
        throw conflict("Já existe um cliente com este e-mail.");
      }

      res.status(201).json(repo.createClient({ name, email, company }));
    }),
  );

  api.patch(
    "/clients/:id",
    asyncRoute((req, res) => {
      const id = parseRouteId(req.params.id);
      const body = requireBody(req.body);
      const current = repo.getClient(id);
      if (!current) {
        throw notFound("Cliente não encontrado.");
      }

      const patch: { name?: string; email?: string; company?: string | null } = {};
      if (hasKey(body, "name")) {
        patch.name = parseName(body.name);
      }
      if (hasKey(body, "email")) {
        patch.email = parseEmail(body.email);
        if (repo.findClientByEmail(patch.email, id)) {
          throw conflict("Já existe um cliente com este e-mail.");
        }
      }
      if (hasKey(body, "company")) {
        patch.company = parseCompany(body.company);
      }

      res.status(200).json(repo.updateClient(current, patch));
    }),
  );

  api.delete(
    "/clients/:id",
    asyncRoute((req, res) => {
      const id = parseRouteId(req.params.id);
      const current = repo.getClient(id);
      if (!current) {
        throw notFound("Cliente não encontrado.");
      }
      if (repo.countDealsByClient(id) > 0) {
        throw conflict(
          "Não é possível excluir um cliente que possui negócios relacionados.",
        );
      }
      repo.deleteClient(id);
      res.status(204).end();
    }),
  );

  /* ------------------------------ deals ------------------------------ */

  api.get(
    "/deals",
    asyncRoute((req, res) => {
      const query = queryRecord(req);
      const { page, pageSize } = parsePageQuery(query);
      const search = parseSearch(query.search);

      let stage: Stage | undefined;
      if (query.stage !== undefined && query.stage !== "") {
        const value = String(query.stage);
        if (!STAGES.includes(value as Stage)) {
          throw badRequest(
            'O filtro de etapa deve ser "new", "contact", "proposal" ou "won".',
          );
        }
        stage = value as Stage;
      }

      let clientId: number | undefined;
      if (query.clientId !== undefined && query.clientId !== "") {
        const parsed = Number(query.clientId);
        if (!Number.isInteger(parsed) || parsed < 1) {
          throw badRequest("O filtro de cliente é inválido.");
        }
        clientId = parsed;
      }

      res.status(200).json(repo.listDeals({ search, stage, clientId, page, pageSize }));
    }),
  );

  api.get(
    "/deals/:id",
    asyncRoute((req, res) => {
      const id = parseRouteId(req.params.id);
      const deal = repo.getDeal(id);
      if (!deal) {
        throw notFound("Negócio não encontrado.");
      }
      res.status(200).json(deal);
    }),
  );

  api.post(
    "/deals",
    asyncRoute((req, res) => {
      const body = requireBody(req.body);
      const title = parseTitle(body.title);
      const valueInCents = parseValueInCents(body.valueInCents);
      const clientId = parseClientId(body.clientId);
      const stage = body.stage === undefined ? "new" : parseStage(body.stage);

      if (!repo.getClient(clientId)) {
        throw badRequest("O cliente informado não existe.");
      }

      res.status(201).json(repo.createDeal({ title, valueInCents, clientId, stage }));
    }),
  );

  api.patch(
    "/deals/:id",
    asyncRoute((req, res) => {
      const id = parseRouteId(req.params.id);
      const body = requireBody(req.body);
      const current = repo.getDeal(id);
      if (!current) {
        throw notFound("Negócio não encontrado.");
      }

      const patch: {
        title?: string;
        valueInCents?: number;
        clientId?: number;
        stage?: Stage;
      } = {};

      if (hasKey(body, "title")) {
        patch.title = parseTitle(body.title);
      }
      if (hasKey(body, "valueInCents")) {
        patch.valueInCents = parseValueInCents(body.valueInCents);
      }
      if (hasKey(body, "stage")) {
        patch.stage = parseStage(body.stage);
      }
      if (hasKey(body, "clientId")) {
        patch.clientId = parseClientId(body.clientId);
        if (!repo.getClient(patch.clientId)) {
          throw badRequest("O cliente informado não existe.");
        }
      }

      res.status(200).json(repo.updateDeal(current, patch));
    }),
  );

  api.delete(
    "/deals/:id",
    asyncRoute((req, res) => {
      const id = parseRouteId(req.params.id);
      const current = repo.getDeal(id);
      if (!current) {
        throw notFound("Negócio não encontrado.");
      }
      repo.deleteDeal(id);
      res.status(204).end();
    }),
  );

  app.use("/api", api);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Recurso não encontrado." });
  });

  /* ----------------------- frontend (produção) ----------------------- */

  const webRoot = options.webRoot;
  if (webRoot && fs.existsSync(path.join(webRoot, "index.html"))) {
    app.use(express.static(webRoot, { index: false, maxAge: "1h" }));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(webRoot, "index.html"));
    });
  }

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (error instanceof SyntaxError) {
      res.status(400).json({ error: "JSON inválido no corpo da requisição." });
      return;
    }
    const message =
      error instanceof Error && error.message.includes("UNIQUE constraint failed")
        ? "Já existe um registro com estes dados."
        : "Erro interno no servidor.";
    const status = message.startsWith("Já existe") ? 409 : 500;
    if (status === 500) {
      console.error(error);
    }
    res.status(status).json({ error: message });
  });

  return app;
}

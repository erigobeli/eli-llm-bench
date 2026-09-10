import express, { type NextFunction, type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import type { DB } from "./db";
import { clientsRouter } from "./routes/clients";
import { dealsRouter } from "./routes/deals";
import { HttpError } from "./validation";
import type { DashboardMetrics } from "../shared/types";

export interface AppOptions {
  /** Directory with the built frontend (index.html + assets). Optional for tests. */
  staticDir?: string;
}

export function createApp(db: DB, options: AppOptions = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/dashboard", (_req, res) => {
    const totalClients = (db.prepare("SELECT COUNT(*) AS n FROM clients").get() as { n: number }).n;
    const open = db
      .prepare("SELECT COUNT(*) AS n, COALESCE(SUM(value_in_cents), 0) AS total FROM deals WHERE stage != 'won'")
      .get() as { n: number; total: number };
    const metrics: DashboardMetrics = {
      totalClients,
      openDeals: open.n,
      pipelineValueInCents: open.total,
    };
    res.json(metrics);
  });

  app.use("/api/clients", clientsRouter(db));
  app.use("/api/deals", dealsRouter(db));

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Rota não encontrada." });
  });

  if (options.staticDir && fs.existsSync(options.staticDir)) {
    const indexHtml = path.join(options.staticDir, "index.html");
    app.use(express.static(options.staticDir, { index: false }));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(indexHtml);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    const anyErr = err as { type?: string; status?: number; code?: string; message?: string };
    if (anyErr?.type === "entity.parse.failed" || anyErr?.status === 400) {
      res.status(400).json({ error: "JSON inválido no corpo da requisição." });
      return;
    }
    if (typeof anyErr?.code === "string" && anyErr.code.startsWith("SQLITE_CONSTRAINT")) {
      res.status(409).json({ error: "Conflito de integridade dos dados." });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Erro interno do servidor." });
  });

  return app;
}

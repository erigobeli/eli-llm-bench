import express, { type Express, type NextFunction, type Request, type Response } from "express";
import path from "node:path";
import fs from "node:fs";
import clientsRouter from "./routes/clients.js";
import dealsRouter from "./routes/deals.js";
import dashboardRouter from "./routes/dashboard.js";

export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.get("/api/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/clients", clientsRouter);
  app.use("/api/deals", dealsRouter);
  app.use("/api/dashboard", dashboardRouter);

  app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({ error: "Rota de API não encontrada." });
  });

  const clientDist = path.resolve(process.cwd(), "dist");
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Erro interno do servidor." });
  });

  return app;
}

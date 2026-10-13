import { existsSync } from 'node:fs';
import { join } from 'node:path';
import express, { type ErrorRequestHandler, type Express } from 'express';
import type { Dashboard } from '../shared/types.js';
import { clientRoutes } from './clients.js';
import type { Db } from './db.js';
import { dealRoutes } from './deals.js';
import { HttpError } from './http.js';

export interface AppOptions {
  /** Pasta com o frontend compilado; quando ausente, somente a API é servida. */
  clientDir?: string;
}

export function createApp(db: Db, options: AppOptions = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/dashboard', (_req, res) => {
    const row = db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM clients) AS totalClients,
           (SELECT COUNT(*) FROM deals WHERE stage <> 'won') AS openDeals,
           (SELECT COALESCE(SUM(value_in_cents), 0) FROM deals WHERE stage <> 'won') AS pipelineValueInCents`,
      )
      .get() as Dashboard;
    res.json(row);
  });

  app.use('/api/clients', clientRoutes(db));
  app.use('/api/deals', dealRoutes(db));
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Rota não encontrada.' });
  });

  if (options.clientDir && existsSync(options.clientDir)) {
    app.use(express.static(options.clientDir, { index: false }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      res.sendFile(join(options.clientDir as string, 'index.html'));
    });
  }

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err?.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'O corpo da requisição não é um JSON válido.' });
      return;
    }
    if (typeof err?.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT')) {
      res.status(409).json({ error: 'A operação viola uma regra de integridade dos dados.' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  };
  app.use(errorHandler);

  return app;
}

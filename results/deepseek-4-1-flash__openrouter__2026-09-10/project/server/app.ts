import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import path from 'node:path';
import { clientsRouter } from './routes/clients';
import { dealsRouter } from './routes/deals';
import { dashboardRouter } from './routes/dashboard';

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/clients', clientsRouter);
  app.use('/api/deals', dealsRouter);
  app.use('/api/dashboard', dashboardRouter);

  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Rota não encontrada.' });
  });

  const publicDir = path.resolve(__dirname, '../public');
  app.use(express.static(publicDir));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError) {
      res.status(400).json({ error: 'JSON inválido.' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  });

  return app;
}

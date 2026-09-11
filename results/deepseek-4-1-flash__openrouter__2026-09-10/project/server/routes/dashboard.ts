import { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb } from '../db';

export const dashboardRouter = Router();

dashboardRouter.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const totalClients = (
    db.prepare('SELECT COUNT(*) AS c FROM clients').get() as { c: number }
  ).c;
  const open = db
    .prepare(
      `SELECT COUNT(*) AS c, IFNULL(SUM(value_in_cents), 0) AS total
       FROM deals WHERE stage <> 'won'`
    )
    .get() as { c: number; total: number };

  res.json({
    totalClients,
    openDeals: open.c,
    pipelineValueInCents: open.total,
  });
});

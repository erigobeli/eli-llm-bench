import { Router, Request, Response } from 'express';
import { getDb } from '../db';

export function createDashboardRouter() {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    try {
      const db = getDb();

      const totalClientsResult = db.prepare('SELECT COUNT(*) as count FROM clients').get() as any;
      const totalClients = totalClientsResult.count;

      const openDealsResult = db.prepare('SELECT COUNT(*) as count FROM deals WHERE stage != ?').get('won') as any;
      const openDeals = openDealsResult.count;

      const pipelineResult = db.prepare(`
        SELECT COALESCE(SUM(valueInCents), 0) as total FROM deals WHERE stage != ?
      `).get('won') as any;
      const pipelineValueInCents = pipelineResult.total;

      res.json({
        totalClients,
        openDeals,
        pipelineValueInCents
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao calcular indicadores' });
    }
  });

  return router;
}

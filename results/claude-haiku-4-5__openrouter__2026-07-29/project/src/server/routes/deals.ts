import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { z } from 'zod';

const DealSchema = z.object({
  title: z.string().trim().min(2).max(120),
  valueInCents: z.number().int().min(0),
  clientId: z.number().int().positive(),
  stage: z.enum(['new', 'contact', 'proposal', 'won'])
});

export function createDealsRouter() {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 10));
      const search = (req.query.search as string || '').toLowerCase();
      const stage = req.query.stage as string;
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : null;

      const db = getDb();
      
      let query = 'SELECT * FROM deals';
      let countQuery = 'SELECT COUNT(*) as total FROM deals';
      const params: any[] = [];

      const conditions: string[] = [];

      if (search) {
        conditions.push('LOWER(title) LIKE ?');
        params.push(`%${search}%`);
      }

      if (stage) {
        conditions.push('stage = ?');
        params.push(stage);
      }

      if (clientId) {
        conditions.push('clientId = ?');
        params.push(clientId);
      }

      if (conditions.length > 0) {
        const whereClause = ' WHERE ' + conditions.join(' AND ');
        query += whereClause;
        countQuery += whereClause;
      }

      query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
      
      const countResult = db.prepare(countQuery).get(...params) as any;
      const total = countResult.total;
      const totalPages = Math.ceil(total / pageSize);

      const offset = (page - 1) * pageSize;
      params.push(pageSize, offset);

      const data = db.prepare(query).all(...params);

      res.json({
        data,
        pagination: { page, pageSize, total, totalPages }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao listar negócios' });
    }
  });

  router.post('/', (req: Request, res: Response) => {
    try {
      const validated = DealSchema.parse(req.body);
      const db = getDb();

      // Check if client exists
      const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(validated.clientId);
      if (!client) {
        return res.status(400).json({ error: 'Cliente não encontrado' });
      }

      const now = new Date().toISOString();
      const result = db.prepare(`
        INSERT INTO deals (title, valueInCents, clientId, stage, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        validated.title.trim(),
        validated.valueInCents,
        validated.clientId,
        validated.stage,
        now,
        now
      );

      const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json(deal);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Dados inválidos' });
      }
      res.status(500).json({ error: 'Erro ao criar negócio' });
    }
  });

  router.patch('/:id', (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      if (!idParam || Array.isArray(idParam)) {
        return res.status(400).json({ error: 'ID inválido' });
      }
      const id = parseInt(idParam);
      const db = getDb();

      // Check if deal exists
      const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(id);
      if (!deal) {
        return res.status(404).json({ error: 'Negócio não encontrado' });
      }

      const updates: any = {};

      if (req.body.title !== undefined) {
        const title = (req.body.title as string).trim();
        if (title.length < 2 || title.length > 120) {
          return res.status(400).json({ error: 'Título deve ter entre 2 e 120 caracteres' });
        }
        updates.title = title;
      }

      if (req.body.valueInCents !== undefined) {
        const value = req.body.valueInCents as number;
        if (!Number.isInteger(value) || value < 0) {
          return res.status(400).json({ error: 'Valor deve ser um inteiro maior ou igual a zero' });
        }
        updates.valueInCents = value;
      }

      if (req.body.clientId !== undefined) {
        const clientId = req.body.clientId as number;
        if (!Number.isInteger(clientId) || clientId <= 0) {
          return res.status(400).json({ error: 'ClientId deve ser um inteiro positivo' });
        }
        const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(clientId);
        if (!client) {
          return res.status(400).json({ error: 'Cliente não encontrado' });
        }
        updates.clientId = clientId;
      }

      if (req.body.stage !== undefined) {
        const stage = req.body.stage as string;
        if (!['new', 'contact', 'proposal', 'won'].includes(stage)) {
          return res.status(400).json({ error: 'Etapa inválida' });
        }
        updates.stage = stage;
      }

      if (Object.keys(updates).length === 0) {
        return res.json(deal);
      }

      updates.updatedAt = new Date().toISOString();

      const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      values.push(id);

      db.prepare(`UPDATE deals SET ${setClauses} WHERE id = ?`).run(...values);

      const updated = db.prepare('SELECT * FROM deals WHERE id = ?').get(id);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao atualizar negócio' });
    }
  });

  router.delete('/:id', (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      if (!idParam || Array.isArray(idParam)) {
        return res.status(400).json({ error: 'ID inválido' });
      }
      const id = parseInt(idParam);
      const db = getDb();

      // Check if deal exists
      const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(id);
      if (!deal) {
        return res.status(404).json({ error: 'Negócio não encontrado' });
      }

      db.prepare('DELETE FROM deals WHERE id = ?').run(id);
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao excluir negócio' });
    }
  });

  return router;
}

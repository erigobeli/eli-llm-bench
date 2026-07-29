import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { z } from 'zod';

const ClientSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email().trim(),
  company: z.string().trim().nullable().optional()
});

export function createClientsRouter() {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 10));
      const search = (req.query.search as string || '').toLowerCase();

      const db = getDb();
      
      let query = 'SELECT * FROM clients';
      let countQuery = 'SELECT COUNT(*) as total FROM clients';
      const params: any[] = [];

      if (search) {
        query += ' WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(COALESCE(company, "")) LIKE ?';
        countQuery += ' WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(COALESCE(company, "")) LIKE ?';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
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
      res.status(500).json({ error: 'Erro ao listar clientes' });
    }
  });

  router.post('/', (req: Request, res: Response) => {
    try {
      const validated = ClientSchema.parse(req.body);
      const db = getDb();

      // Check if email already exists
      const existing = db.prepare('SELECT id FROM clients WHERE LOWER(email) = LOWER(?)').get(validated.email);
      if (existing) {
        return res.status(409).json({ error: 'E-mail já cadastrado' });
      }

      const now = new Date().toISOString();
      const result = db.prepare(`
        INSERT INTO clients (name, email, company, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        validated.name.trim(),
        validated.email.trim(),
        validated.company?.trim() || null,
        now,
        now
      );

      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
      res.status(201).json(client);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: 'Dados inválidos' });
      }
      res.status(500).json({ error: 'Erro ao criar cliente' });
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

      // Check if client exists
      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      const updates: any = {};
      if (req.body.name !== undefined) {
        const name = (req.body.name as string).trim();
        if (name.length < 2 || name.length > 80) {
          return res.status(400).json({ error: 'Nome deve ter entre 2 e 80 caracteres' });
        }
        updates.name = name;
      }

      if (req.body.email !== undefined) {
        const email = (req.body.email as string).trim();
        try {
          z.string().email().parse(email);
        } catch {
          return res.status(400).json({ error: 'E-mail inválido' });
        }
        
        // Check if email is already used by another client
        const existing = db.prepare('SELECT id FROM clients WHERE LOWER(email) = LOWER(?) AND id != ?').get(email, id);
        if (existing) {
          return res.status(409).json({ error: 'E-mail já cadastrado' });
        }
        updates.email = email;
      }

      if (req.body.company !== undefined) {
        updates.company = req.body.company ? (req.body.company as string).trim() : null;
      }

      if (Object.keys(updates).length === 0) {
        return res.json(client);
      }

      updates.updatedAt = new Date().toISOString();

      const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      values.push(id);

      db.prepare(`UPDATE clients SET ${setClauses} WHERE id = ?`).run(...values);

      const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao atualizar cliente' });
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

      // Check if client exists
      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      // Check if client has deals
      const deals = db.prepare('SELECT COUNT(*) as count FROM deals WHERE clientId = ?').get(id) as any;
      if (deals.count > 0) {
        return res.status(409).json({ error: 'Cliente possui negócios relacionados' });
      }

      db.prepare('DELETE FROM clients WHERE id = ?').run(id);
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ error: 'Erro ao excluir cliente' });
    }
  });

  return router;
}

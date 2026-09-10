import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { getDb } from './db.js';
import type { Client, Deal, DealStage, PaginatedResponse, DashboardMetrics } from '../shared/types.js';

const VALID_STAGES: DealStage[] = ['new', 'contact', 'proposal', 'won'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createApp(customDb?: Database.Database) {
  const app = express();
  app.use(express.json());

  const db = customDb || getDb();

  // Helper error response
  function sendError(res: Response, status: number, message: string) {
    return res.status(status).json({ error: message });
  }

  // REQ-SETUP-START: GET /api/health
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  // REQ-METRICS-ACCURACY: GET /api/dashboard
  app.get('/api/dashboard', (_req: Request, res: Response) => {
    try {
      const clientCountRow = db.prepare('SELECT COUNT(id) as count FROM clients').get() as { count: number };
      const dealsRow = db.prepare(`
        SELECT COUNT(id) as count, COALESCE(SUM(valueInCents), 0) as totalValue
        FROM deals
        WHERE stage != 'won'
      `).get() as { count: number; totalValue: number };

      const metrics: DashboardMetrics = {
        totalClients: clientCountRow.count,
        openDeals: dealsRow.count,
        pipelineValueInCents: dealsRow.totalValue || 0,
      };

      res.status(200).json(metrics);
    } catch (err) {
      sendError(res, 500, 'Erro interno ao consultar indicadores.');
    }
  });

  // --- CLIENTS ROUTES ---

  // REQ-CLIENT-READ: GET /api/clients
  app.get('/api/clients', (req: Request, res: Response) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      let page = parseInt(req.query.page as string, 10);
      if (isNaN(page) || page < 1) page = 1;

      let pageSize = parseInt(req.query.pageSize as string, 10);
      if (isNaN(pageSize) || pageSize < 1) pageSize = 10;
      if (pageSize > 50) pageSize = 50;

      const offset = (page - 1) * pageSize;

      let whereClause = '';
      const params: any[] = [];

      if (search) {
        whereClause = 'WHERE (LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(company) LIKE ?)';
        const searchPattern = `%${search.toLowerCase()}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      const totalRow = db.prepare(`SELECT COUNT(id) as count FROM clients ${whereClause}`).get(...params) as { count: number };
      const total = totalRow ? totalRow.count : 0;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));

      const rows = db.prepare(`
        SELECT id, name, email, company, createdAt, updatedAt
        FROM clients
        ${whereClause}
        ORDER BY id ASC
        LIMIT ? OFFSET ?
      `).all(...params, pageSize, offset) as Client[];

      const response: PaginatedResponse<Client> = {
        data: rows.map(r => ({ ...r, company: r.company ?? null })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      };

      res.status(200).json(response);
    } catch (err) {
      sendError(res, 500, 'Erro interno ao buscar clientes.');
    }
  });

  // REQ-CLIENT-CREATE: POST /api/clients
  app.post('/api/clients', (req: Request, res: Response) => {
    try {
      const { name, email, company } = req.body;

      if (!name || typeof name !== 'string') {
        return sendError(res, 400, 'Nome do cliente é obrigatório.');
      }
      const trimmedName = name.trim();
      if (trimmedName.length < 2 || trimmedName.length > 80) {
        return sendError(res, 400, 'Nome do cliente deve ter entre 2 e 80 caracteres.');
      }

      if (!email || typeof email !== 'string') {
        return sendError(res, 400, 'E-mail do cliente é obrigatório.');
      }
      const trimmedEmail = email.trim();
      if (!EMAIL_REGEX.test(trimmedEmail)) {
        return sendError(res, 400, 'Formato de e-mail inválido.');
      }

      // Check unique email case-insensitive
      const existing = db.prepare('SELECT id FROM clients WHERE LOWER(email) = LOWER(?)').get(trimmedEmail);
      if (existing) {
        return sendError(res, 409, 'Já existe um cliente cadastrado com este e-mail.');
      }

      let companyVal: string | null = null;
      if (company !== undefined && company !== null) {
        if (typeof company !== 'string') {
          return sendError(res, 400, 'Empresa deve ser um texto válido.');
        }
        const trimmedCompany = company.trim();
        companyVal = trimmedCompany.length > 0 ? trimmedCompany : null;
      }

      const now = new Date().toISOString();
      const insert = db.prepare(`
        INSERT INTO clients (name, email, company, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(trimmedName, trimmedEmail, companyVal, now, now);

      const created = db.prepare(`
        SELECT id, name, email, company, createdAt, updatedAt
        FROM clients
        WHERE id = ?
      `).get(insert.lastInsertRowid) as Client;

      return res.status(201).json({ ...created, company: created.company ?? null });
    } catch (err) {
      return sendError(res, 500, 'Erro interno ao criar cliente.');
    }
  });

  // REQ-CLIENT-UPDATE: PATCH /api/clients/:id
  app.patch('/api/clients/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return sendError(res, 400, 'ID inválido.');
      }

      const existing = db.prepare('SELECT id, name, email, company, createdAt, updatedAt FROM clients WHERE id = ?').get(id) as Client | undefined;
      if (!existing) {
        return sendError(res, 404, 'Cliente não encontrado.');
      }

      let updatedName = existing.name;
      let updatedEmail = existing.email;
      let updatedCompany = existing.company;

      if (req.body.name !== undefined) {
        if (typeof req.body.name !== 'string') {
          return sendError(res, 400, 'Nome do cliente deve ser um texto.');
        }
        const trimmed = req.body.name.trim();
        if (trimmed.length < 2 || trimmed.length > 80) {
          return sendError(res, 400, 'Nome do cliente deve ter entre 2 e 80 caracteres.');
        }
        updatedName = trimmed;
      }

      if (req.body.email !== undefined) {
        if (typeof req.body.email !== 'string') {
          return sendError(res, 400, 'E-mail do cliente deve ser um texto.');
        }
        const trimmed = req.body.email.trim();
        if (!EMAIL_REGEX.test(trimmed)) {
          return sendError(res, 400, 'Formato de e-mail inválido.');
        }
        const duplicate = db.prepare('SELECT id FROM clients WHERE LOWER(email) = LOWER(?) AND id != ?').get(trimmed, id);
        if (duplicate) {
          return sendError(res, 409, 'Já existe outro cliente cadastrado com este e-mail.');
        }
        updatedEmail = trimmed;
      }

      if (req.body.company !== undefined) {
        if (req.body.company === null) {
          updatedCompany = null;
        } else if (typeof req.body.company === 'string') {
          const trimmed = req.body.company.trim();
          updatedCompany = trimmed.length > 0 ? trimmed : null;
        } else {
          return sendError(res, 400, 'Empresa deve ser um texto ou nulo.');
        }
      }

      const now = new Date().toISOString();
      db.prepare(`
        UPDATE clients
        SET name = ?, email = ?, company = ?, updatedAt = ?
        WHERE id = ?
      `).run(updatedName, updatedEmail, updatedCompany, now, id);

      const updated = db.prepare(`
        SELECT id, name, email, company, createdAt, updatedAt
        FROM clients
        WHERE id = ?
      `).get(id) as Client;

      return res.status(200).json({ ...updated, company: updated.company ?? null });
    } catch (err) {
      return sendError(res, 500, 'Erro interno ao atualizar cliente.');
    }
  });

  // REQ-CLIENT-DELETE: DELETE /api/clients/:id
  app.delete('/api/clients/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return sendError(res, 400, 'ID inválido.');
      }

      const existing = db.prepare('SELECT id FROM clients WHERE id = ?').get(id);
      if (!existing) {
        return sendError(res, 404, 'Cliente não encontrado.');
      }

      // Check if client has associated deals
      const dealsCount = db.prepare('SELECT COUNT(id) as count FROM deals WHERE clientId = ?').get(id) as { count: number };
      if (dealsCount && dealsCount.count > 0) {
        return sendError(res, 409, 'Não é possível excluir cliente com negócios relacionados.');
      }

      db.prepare('DELETE FROM clients WHERE id = ?').run(id);
      return res.status(204).send();
    } catch (err) {
      return sendError(res, 500, 'Erro interno ao excluir cliente.');
    }
  });

  // --- DEALS ROUTES ---

  // REQ-DEAL-READ: GET /api/deals
  app.get('/api/deals', (req: Request, res: Response) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const stage = typeof req.query.stage === 'string' ? req.query.stage.trim() : '';
      const clientIdStr = typeof req.query.clientId === 'string' ? req.query.clientId.trim() : '';

      let page = parseInt(req.query.page as string, 10);
      if (isNaN(page) || page < 1) page = 1;

      let pageSize = parseInt(req.query.pageSize as string, 10);
      if (isNaN(pageSize) || pageSize < 1) pageSize = 10;
      if (pageSize > 50) pageSize = 50;

      const offset = (page - 1) * pageSize;

      const whereClauses: string[] = [];
      const params: any[] = [];

      if (search) {
        whereClauses.push('LOWER(title) LIKE ?');
        params.push(`%${search.toLowerCase()}%`);
      }

      if (stage) {
        if (VALID_STAGES.includes(stage as DealStage)) {
          whereClauses.push('stage = ?');
          params.push(stage);
        } else {
          // If stage filter is invalid, return empty list
          return res.status(200).json({
            data: [],
            pagination: { page, pageSize, total: 0, totalPages: 1 },
          });
        }
      }

      if (clientIdStr) {
        const parsedClientId = parseInt(clientIdStr, 10);
        if (!isNaN(parsedClientId)) {
          whereClauses.push('clientId = ?');
          params.push(parsedClientId);
        }
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const totalRow = db.prepare(`SELECT COUNT(id) as count FROM deals ${whereSql}`).get(...params) as { count: number };
      const total = totalRow ? totalRow.count : 0;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));

      const rows = db.prepare(`
        SELECT id, title, valueInCents, clientId, stage, createdAt, updatedAt
        FROM deals
        ${whereSql}
        ORDER BY id ASC
        LIMIT ? OFFSET ?
      `).all(...params, pageSize, offset) as Deal[];

      const response: PaginatedResponse<Deal> = {
        data: rows,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      };

      res.status(200).json(response);
    } catch (err) {
      sendError(res, 500, 'Erro interno ao buscar negócios.');
    }
  });

  // REQ-DEAL-CREATE & REQ-DEAL-VALIDATION: POST /api/deals
  app.post('/api/deals', (req: Request, res: Response) => {
    try {
      const { title, valueInCents, clientId, stage } = req.body;

      if (!title || typeof title !== 'string') {
        return sendError(res, 400, 'Título do negócio é obrigatório.');
      }
      const trimmedTitle = title.trim();
      if (trimmedTitle.length < 2 || trimmedTitle.length > 120) {
        return sendError(res, 400, 'Título do negócio deve ter entre 2 e 120 caracteres.');
      }

      if (valueInCents === undefined || typeof valueInCents !== 'number' || !Number.isInteger(valueInCents) || valueInCents < 0) {
        return sendError(res, 400, 'Valor em centavos deve ser um número inteiro maior ou igual a zero.');
      }

      if (!clientId || typeof clientId !== 'number' || !Number.isInteger(clientId)) {
        return sendError(res, 400, 'Cliente é obrigatório e deve ser um identificador válido.');
      }

      const clientExists = db.prepare('SELECT id FROM clients WHERE id = ?').get(clientId);
      if (!clientExists) {
        return sendError(res, 400, 'Cliente informado não existe.');
      }

      if (!stage || !VALID_STAGES.includes(stage)) {
        return sendError(res, 400, 'Etapa inválida. Deve ser new, contact, proposal ou won.');
      }

      const now = new Date().toISOString();
      const insert = db.prepare(`
        INSERT INTO deals (title, valueInCents, clientId, stage, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(trimmedTitle, valueInCents, clientId, stage, now, now);

      const created = db.prepare(`
        SELECT id, title, valueInCents, clientId, stage, createdAt, updatedAt
        FROM deals
        WHERE id = ?
      `).get(insert.lastInsertRowid) as Deal;

      return res.status(201).json(created);
    } catch (err) {
      return sendError(res, 500, 'Erro interno ao criar negócio.');
    }
  });

  // REQ-DEAL-UPDATE: PATCH /api/deals/:id
  app.patch('/api/deals/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return sendError(res, 400, 'ID inválido.');
      }

      const existing = db.prepare('SELECT id, title, valueInCents, clientId, stage, createdAt, updatedAt FROM deals WHERE id = ?').get(id) as Deal | undefined;
      if (!existing) {
        return sendError(res, 404, 'Negócio não encontrado.');
      }

      let updatedTitle = existing.title;
      let updatedValue = existing.valueInCents;
      let updatedClientId = existing.clientId;
      let updatedStage = existing.stage;

      if (req.body.title !== undefined) {
        if (typeof req.body.title !== 'string') {
          return sendError(res, 400, 'Título deve ser um texto.');
        }
        const trimmed = req.body.title.trim();
        if (trimmed.length < 2 || trimmed.length > 120) {
          return sendError(res, 400, 'Título do negócio deve ter entre 2 e 120 caracteres.');
        }
        updatedTitle = trimmed;
      }

      if (req.body.valueInCents !== undefined) {
        if (typeof req.body.valueInCents !== 'number' || !Number.isInteger(req.body.valueInCents) || req.body.valueInCents < 0) {
          return sendError(res, 400, 'Valor em centavos deve ser um número inteiro maior ou igual a zero.');
        }
        updatedValue = req.body.valueInCents;
      }

      if (req.body.clientId !== undefined) {
        if (typeof req.body.clientId !== 'number' || !Number.isInteger(req.body.clientId)) {
          return sendError(res, 400, 'ID do cliente deve ser um número inteiro.');
        }
        const clientExists = db.prepare('SELECT id FROM clients WHERE id = ?').get(req.body.clientId);
        if (!clientExists) {
          return sendError(res, 400, 'Cliente informado não existe.');
        }
        updatedClientId = req.body.clientId;
      }

      if (req.body.stage !== undefined) {
        if (!VALID_STAGES.includes(req.body.stage)) {
          return sendError(res, 400, 'Etapa inválida. Deve ser new, contact, proposal ou won.');
        }
        updatedStage = req.body.stage;
      }

      const now = new Date().toISOString();
      db.prepare(`
        UPDATE deals
        SET title = ?, valueInCents = ?, clientId = ?, stage = ?, updatedAt = ?
        WHERE id = ?
      `).run(updatedTitle, updatedValue, updatedClientId, updatedStage, now, id);

      const updated = db.prepare(`
        SELECT id, title, valueInCents, clientId, stage, createdAt, updatedAt
        FROM deals
        WHERE id = ?
      `).get(id) as Deal;

      return res.status(200).json(updated);
    } catch (err) {
      return sendError(res, 500, 'Erro interno ao atualizar negócio.');
    }
  });

  // REQ-DEAL-DELETE: DELETE /api/deals/:id
  app.delete('/api/deals/:id', (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return sendError(res, 400, 'ID inválido.');
      }

      const existing = db.prepare('SELECT id FROM deals WHERE id = ?').get(id);
      if (!existing) {
        return sendError(res, 404, 'Negócio não encontrado.');
      }

      db.prepare('DELETE FROM deals WHERE id = ?').run(id);
      return res.status(204).send();
    } catch (err) {
      return sendError(res, 500, 'Erro interno ao excluir negócio.');
    }
  });

  // Client-side routing fallback & static asset serving (if client build exists)
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidateDirs = [
    path.resolve(process.cwd(), 'dist', 'client'),
    path.resolve(currentDir, '..', 'client'),
    path.resolve(currentDir, 'client'),
  ];
  const clientDist = candidateDirs.find((dir) => fs.existsSync(dir));

  if (clientDist) {
    app.use(express.static(clientDist));
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}

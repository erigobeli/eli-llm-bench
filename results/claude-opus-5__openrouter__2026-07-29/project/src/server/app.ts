import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import type { Db } from './db';
import type { Client, Deal, Paginated, Stage } from './types';
import { STAGES } from './types';
import {
  HttpError,
  badRequest,
  conflict,
  isPlainObject,
  notFound,
  nowIso,
  parseCompany,
  parseEmail,
  parseId,
  parseName,
  parsePageQuery,
  parseSearch,
  parseStage,
  parseTitle,
  parseValueInCents,
} from './validation';

function registerFunctions(db: Db): void {
  try {
    db.function('ulower', { deterministic: true }, (value: unknown) =>
      typeof value === 'string' ? value.toLowerCase() : value === null ? null : String(value ?? '').toLowerCase(),
    );
  } catch {
    // função já registrada
  }
}

/** Garante que updatedAt sempre avance, mesmo em atualizações no mesmo milissegundo. */
function nextTimestamp(previous: string): string {
  const now = nowIso();
  if (now > previous) {
    return now;
  }
  const previousTime = Date.parse(previous);
  const base = Number.isNaN(previousTime) ? Date.now() : previousTime;
  return new Date(base + 1).toISOString();
}

function paginate<T>(rows: T[], total: number, page: number, pageSize: number): Paginated<T> {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  return { data: rows, pagination: { page, pageSize, total, totalPages } };
}

function mapClient(row: any): Client {
  return {
    id: Number(row.id),
    name: String(row.name),
    email: String(row.email),
    company: row.company === null || row.company === undefined ? null : String(row.company),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function mapDeal(row: any): Deal {
  return {
    id: Number(row.id),
    title: String(row.title),
    valueInCents: Number(row.valueInCents),
    clientId: Number(row.clientId),
    stage: String(row.stage) as Stage,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function findClient(db: Db, id: number): Client | null {
  const row = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  return row ? mapClient(row) : null;
}

function findDeal(db: Db, id: number): Deal | null {
  const row = db.prepare('SELECT * FROM deals WHERE id = ?').get(id);
  return row ? mapDeal(row) : null;
}

function emailTaken(db: Db, email: string, exceptId?: number): boolean {
  const row = db
    .prepare(
      `SELECT id FROM clients WHERE ulower(email) = ulower(?) AND (? IS NULL OR id <> ?) LIMIT 1`,
    )
    .get(email, exceptId ?? null, exceptId ?? 0);
  return Boolean(row);
}

export function createApp(db: Db): Express {
  registerFunctions(db);

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  const api = express.Router();

  api.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  api.get('/dashboard', (_req, res) => {
    const totalClients = Number(
      (db.prepare('SELECT COUNT(*) AS total FROM clients').get() as any).total,
    );
    const open = db
      .prepare(
        `SELECT COUNT(*) AS total, COALESCE(SUM(valueInCents), 0) AS value
         FROM deals WHERE stage <> 'won'`,
      )
      .get() as any;
    res.json({
      totalClients,
      openDeals: Number(open.total),
      pipelineValueInCents: Number(open.value),
    });
  });

  // ---------------------------------------------------------------- clientes
  api.get('/clients', (req, res) => {
    const { page, pageSize } = parsePageQuery(req.query as Record<string, unknown>);
    const search = parseSearch(req.query.search);

    const where: string[] = [];
    const params: unknown[] = [];
    if (search) {
      where.push(
        '(ulower(name) LIKE ? OR ulower(email) LIKE ? OR ulower(COALESCE(company, \'\')) LIKE ?)',
      );
      const like = `%${search.toLowerCase()}%`;
      params.push(like, like, like);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = Number(
      (db.prepare(`SELECT COUNT(*) AS total FROM clients ${whereSql}`).get(...params) as any).total,
    );
    const rows = db
      .prepare(
        `SELECT * FROM clients ${whereSql} ORDER BY datetime(createdAt) DESC, id DESC LIMIT ? OFFSET ?`,
      )
      .all(...params, pageSize, (page - 1) * pageSize) as any[];

    res.json(paginate(rows.map(mapClient), total, page, pageSize));
  });

  api.get('/clients/:id', (req, res) => {
    const id = parseId(req.params.id, 'Cliente não encontrado.');
    const client = findClient(db, id);
    if (!client) throw notFound('Cliente não encontrado.');
    res.json(client);
  });

  api.get('/clients/:id/deals', (req, res) => {
    const id = parseId(req.params.id, 'Cliente não encontrado.');
    if (!findClient(db, id)) throw notFound('Cliente não encontrado.');
    const rows = db
      .prepare('SELECT * FROM deals WHERE clientId = ? ORDER BY datetime(createdAt) DESC, id DESC')
      .all(id) as any[];
    res.json({ data: rows.map(mapDeal) });
  });

  api.post('/clients', (req, res) => {
    if (!isPlainObject(req.body)) throw badRequest('Envie um objeto JSON válido.');
    const name = parseName(req.body.name);
    const email = parseEmail(req.body.email);
    const company = parseCompany(req.body.company);

    if (emailTaken(db, email)) {
      throw conflict('Já existe um cliente com este e-mail.');
    }

    const timestamp = nowIso();
    const info = db
      .prepare(
        `INSERT INTO clients (name, email, company, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(name, email, company, timestamp, timestamp);

    res.status(201).json(findClient(db, Number(info.lastInsertRowid)));
  });

  api.patch('/clients/:id', (req, res) => {
    const id = parseId(req.params.id, 'Cliente não encontrado.');
    if (!isPlainObject(req.body)) throw badRequest('Envie um objeto JSON válido.');
    const current = findClient(db, id);
    if (!current) throw notFound('Cliente não encontrado.');

    const next: Partial<Client> = {};
    if ('name' in req.body) next.name = parseName(req.body.name);
    if ('email' in req.body) next.email = parseEmail(req.body.email);
    if ('company' in req.body) next.company = parseCompany(req.body.company);

    if (Object.keys(next).length === 0) {
      throw badRequest('Envie ao menos um campo para atualizar.');
    }
    if (next.email && emailTaken(db, next.email, id)) {
      throw conflict('Já existe um cliente com este e-mail.');
    }

    const updatedAt = nextTimestamp(current.updatedAt);
    db.prepare(
      `UPDATE clients SET name = ?, email = ?, company = ?, updatedAt = ? WHERE id = ?`,
    ).run(
      next.name ?? current.name,
      next.email ?? current.email,
      next.company !== undefined ? next.company : current.company,
      updatedAt,
      id,
    );

    res.status(200).json(findClient(db, id));
  });

  api.delete('/clients/:id', (req, res) => {
    const id = parseId(req.params.id, 'Cliente não encontrado.');
    if (!findClient(db, id)) throw notFound('Cliente não encontrado.');
    const related = Number(
      (db.prepare('SELECT COUNT(*) AS total FROM deals WHERE clientId = ?').get(id) as any).total,
    );
    if (related > 0) {
      throw conflict('Não é possível excluir um cliente que possui negócios relacionados.');
    }
    db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    res.status(204).end();
  });

  // ---------------------------------------------------------------- negócios
  api.get('/deals', (req, res) => {
    const { page, pageSize } = parsePageQuery(req.query as Record<string, unknown>);
    const search = parseSearch(req.query.search);

    const where: string[] = [];
    const params: unknown[] = [];

    if (search) {
      where.push('ulower(title) LIKE ?');
      params.push(`%${search.toLowerCase()}%`);
    }
    if (req.query.stage !== undefined && req.query.stage !== '') {
      const stage = parseStage(req.query.stage);
      where.push('stage = ?');
      params.push(stage);
    }
    if (req.query.clientId !== undefined && req.query.clientId !== '') {
      const clientId = parseId(req.query.clientId, 'O parâmetro clientId é inválido.');
      where.push('clientId = ?');
      params.push(clientId);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = Number(
      (db.prepare(`SELECT COUNT(*) AS total FROM deals ${whereSql}`).get(...params) as any).total,
    );
    const rows = db
      .prepare(
        `SELECT * FROM deals ${whereSql} ORDER BY datetime(createdAt) DESC, id DESC LIMIT ? OFFSET ?`,
      )
      .all(...params, pageSize, (page - 1) * pageSize) as any[];

    res.json(paginate(rows.map(mapDeal), total, page, pageSize));
  });

  api.get('/deals/:id', (req, res) => {
    const id = parseId(req.params.id, 'Negócio não encontrado.');
    const deal = findDeal(db, id);
    if (!deal) throw notFound('Negócio não encontrado.');
    res.json(deal);
  });

  api.post('/deals', (req, res) => {
    if (!isPlainObject(req.body)) throw badRequest('Envie um objeto JSON válido.');
    const title = parseTitle(req.body.title);
    const valueInCents = parseValueInCents(req.body.valueInCents);
    const clientId = parseId(req.body.clientId, 'Informe um cliente válido para o negócio.');
    const stage = req.body.stage === undefined ? ('new' as Stage) : parseStage(req.body.stage);

    if (!findClient(db, clientId)) {
      throw badRequest('O cliente informado não existe.');
    }

    const timestamp = nowIso();
    const info = db
      .prepare(
        `INSERT INTO deals (title, valueInCents, clientId, stage, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(title, valueInCents, clientId, stage, timestamp, timestamp);

    res.status(201).json(findDeal(db, Number(info.lastInsertRowid)));
  });

  api.patch('/deals/:id', (req, res) => {
    const id = parseId(req.params.id, 'Negócio não encontrado.');
    if (!isPlainObject(req.body)) throw badRequest('Envie um objeto JSON válido.');
    const current = findDeal(db, id);
    if (!current) throw notFound('Negócio não encontrado.');

    const next: Partial<Deal> = {};
    if ('title' in req.body) next.title = parseTitle(req.body.title);
    if ('valueInCents' in req.body) next.valueInCents = parseValueInCents(req.body.valueInCents);
    if ('stage' in req.body) next.stage = parseStage(req.body.stage);
    if ('clientId' in req.body) {
      next.clientId = parseId(req.body.clientId, 'Informe um cliente válido para o negócio.');
      if (!findClient(db, next.clientId)) {
        throw badRequest('O cliente informado não existe.');
      }
    }

    if (Object.keys(next).length === 0) {
      throw badRequest('Envie ao menos um campo para atualizar.');
    }

    const updatedAt = nextTimestamp(current.updatedAt);
    db.prepare(
      `UPDATE deals SET title = ?, valueInCents = ?, clientId = ?, stage = ?, updatedAt = ? WHERE id = ?`,
    ).run(
      next.title ?? current.title,
      next.valueInCents ?? current.valueInCents,
      next.clientId ?? current.clientId,
      next.stage ?? current.stage,
      updatedAt,
      id,
    );

    res.status(200).json(findDeal(db, id));
  });

  api.delete('/deals/:id', (req, res) => {
    const id = parseId(req.params.id, 'Negócio não encontrado.');
    if (!findDeal(db, id)) throw notFound('Negócio não encontrado.');
    db.prepare('DELETE FROM deals WHERE id = ?').run(id);
    res.status(204).end();
  });

  api.get('/stages', (_req, res) => {
    res.json({ data: STAGES });
  });

  app.use('/api', api);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Recurso não encontrado.' });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err instanceof SyntaxError) {
      res.status(400).json({ error: 'JSON inválido no corpo da requisição.' });
      return;
    }
    const message = err instanceof Error ? err.message : '';
    if (/UNIQUE constraint failed/i.test(message)) {
      res.status(409).json({ error: 'Já existe um registro com estes dados.' });
      return;
    }
    if (/FOREIGN KEY constraint failed/i.test(message)) {
      res.status(409).json({ error: 'Existem registros relacionados que impedem esta operação.' });
      return;
    }
    if (/CHECK constraint failed/i.test(message)) {
      res.status(400).json({ error: 'Dados inválidos para esta operação.' });
      return;
    }
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  });

  return app;
}

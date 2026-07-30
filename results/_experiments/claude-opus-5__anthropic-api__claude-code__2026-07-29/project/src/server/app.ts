import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import type { AppDatabase } from './db';
import { HttpError, badRequest } from './errors';
import * as store from './store';
import {
  parseClientId,
  parseCompany,
  parseEmail,
  parseName,
  parseOptionalClientIdFilter,
  parseOptionalStageFilter,
  parsePagination,
  parseRouteId,
  parseSearch,
  parseStage,
  parseTitle,
  parseValueInCents,
  requireBody,
} from './validation';

/** Diretório do módulo atual; em ESM (testes) recai para o diretório de trabalho. */
const moduleDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

/** Localiza o build do frontend, se existir. */
function findClientDist(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'dist/client'),
    path.resolve(moduleDir, '../client'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) return candidate;
  }
  return null;
}

const asyncRoute =
  (handler: (req: Request, res: Response) => void) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      handler(req, res);
    } catch (error) {
      next(error);
    }
  };

export function createApp(db: AppDatabase) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  const api = express.Router();

  /* ---------------------------------------------------------------- saúde */
  api.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  /* ------------------------------------------------------------- clientes */
  api.get(
    '/clients',
    asyncRoute((req, res) => {
      const query = req.query as Record<string, unknown>;
      const { page, pageSize } = parsePagination(query);
      const result = store.listClients(db, { search: parseSearch(query.search), page, pageSize });
      res.status(200).json(result);
    }),
  );

  api.post(
    '/clients',
    asyncRoute((req, res) => {
      const body = requireBody(req.body);
      const client = store.createClient(db, {
        name: parseName(body.name),
        email: parseEmail(body.email),
        company: parseCompany(body.company),
      });
      res.status(201).json(client);
    }),
  );

  api.get(
    '/clients/:id',
    asyncRoute((req, res) => {
      const id = parseRouteId(req.params.id, 'cliente');
      res.status(200).json(store.getClientOrFail(db, id));
    }),
  );

  api.patch(
    '/clients/:id',
    asyncRoute((req, res) => {
      const id = parseRouteId(req.params.id, 'cliente');
      const body = requireBody(req.body);
      const input: store.UpdateClientInput = {};
      if ('name' in body) input.name = parseName(body.name);
      if ('email' in body) input.email = parseEmail(body.email);
      if ('company' in body) input.company = parseCompany(body.company);
      if (Object.keys(input).length === 0) {
        throw badRequest('Informe ao menos um campo para atualizar.');
      }
      res.status(200).json(store.updateClient(db, id, input));
    }),
  );

  api.delete(
    '/clients/:id',
    asyncRoute((req, res) => {
      const id = parseRouteId(req.params.id, 'cliente');
      store.deleteClient(db, id);
      res.status(204).end();
    }),
  );

  /* ------------------------------------------------------------- negócios */
  api.get(
    '/deals',
    asyncRoute((req, res) => {
      const query = req.query as Record<string, unknown>;
      const { page, pageSize } = parsePagination(query);
      const result = store.listDeals(db, {
        search: parseSearch(query.search),
        stage: parseOptionalStageFilter(query.stage),
        clientId: parseOptionalClientIdFilter(query.clientId),
        page,
        pageSize,
      });
      res.status(200).json(result);
    }),
  );

  api.post(
    '/deals',
    asyncRoute((req, res) => {
      const body = requireBody(req.body);
      const clientId = parseClientId(body.clientId);
      if (!store.getClient(db, clientId)) {
        throw badRequest('O cliente informado não existe.');
      }
      const deal = store.createDeal(db, {
        title: parseTitle(body.title),
        valueInCents: parseValueInCents(body.valueInCents),
        clientId,
        stage: body.stage === undefined ? 'new' : parseStage(body.stage),
      });
      res.status(201).json(deal);
    }),
  );

  api.get(
    '/deals/:id',
    asyncRoute((req, res) => {
      const id = parseRouteId(req.params.id, 'negócio');
      res.status(200).json(store.getDealOrFail(db, id));
    }),
  );

  api.patch(
    '/deals/:id',
    asyncRoute((req, res) => {
      const id = parseRouteId(req.params.id, 'negócio');
      const body = requireBody(req.body);
      const input: store.UpdateDealInput = {};
      if ('title' in body) input.title = parseTitle(body.title);
      if ('valueInCents' in body) input.valueInCents = parseValueInCents(body.valueInCents);
      if ('stage' in body) input.stage = parseStage(body.stage);
      if ('clientId' in body) {
        const clientId = parseClientId(body.clientId);
        if (!store.getClient(db, clientId)) {
          throw badRequest('O cliente informado não existe.');
        }
        input.clientId = clientId;
      }
      if (Object.keys(input).length === 0) {
        throw badRequest('Informe ao menos um campo para atualizar.');
      }
      res.status(200).json(store.updateDeal(db, id, input));
    }),
  );

  api.delete(
    '/deals/:id',
    asyncRoute((req, res) => {
      const id = parseRouteId(req.params.id, 'negócio');
      store.deleteDeal(db, id);
      res.status(204).end();
    }),
  );

  /* ----------------------------------------------------------- indicadores */
  api.get(
    '/dashboard',
    asyncRoute((_req, res) => {
      res.status(200).json(store.getDashboardMetrics(db));
    }),
  );

  app.use('/api', api);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Rota não encontrada.' });
  });

  /* -------------------------------------------------- frontend de produção */
  const clientDist = findClientDist();
  if (clientDist) {
    app.use(express.static(clientDist, { index: false }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  /* --------------------------------------------------------------- erros */
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (error instanceof SyntaxError) {
      res.status(400).json({ error: 'JSON inválido no corpo da requisição.' });
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (/UNIQUE constraint failed/i.test(message)) {
      res.status(409).json({ error: 'Já existe um registro com estes dados.' });
      return;
    }
    if (/FOREIGN KEY constraint failed/i.test(message)) {
      res.status(400).json({ error: 'O cliente informado não existe.' });
      return;
    }
    if (/CHECK constraint failed/i.test(message)) {
      res.status(400).json({ error: 'Dados inválidos para o registro.' });
      return;
    }
    // eslint-disable-next-line no-console
    console.error(error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  });

  return app;
}

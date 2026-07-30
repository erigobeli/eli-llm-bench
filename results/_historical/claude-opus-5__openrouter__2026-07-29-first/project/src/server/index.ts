import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createApp } from './app';
import { openDatabase, resolveDbPath } from './db';

const PORT = Number.parseInt(process.env.PORT ?? '', 10) || 3000;
const dbPath = resolveDbPath(process.env.DB_PATH);

const db = openDatabase(dbPath);
const app = createApp(db);

// Frontend de produção servido na mesma origem da API.
const clientDir = path.resolve(__dirname, '..', 'client');
const indexHtml = path.join(clientDir, 'index.html');

if (fs.existsSync(indexHtml)) {
  app.use(express.static(clientDir, { index: false }));
  app.get('*', (_req, res) => {
    res.sendFile(indexHtml);
  });
} else {
  app.get('*', (_req, res) => {
    res
      .status(503)
      .type('text/plain; charset=utf-8')
      .send('Frontend não compilado. Execute "npm run build" antes de "npm start".');
  });
}

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`CRMBench Modelo em execução: http://localhost:${PORT} (banco: ${dbPath})`);
});

function shutdown(): void {
  server.close(() => {
    try {
      db.close();
    } catch {
      // ignora
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

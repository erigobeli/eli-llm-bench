import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createApp } from './app.js';

const app = createApp();
const here = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(here, '../client');
if (existsSync(clientDir)) {
  app.use(express.static(clientDir));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve(clientDir, 'index.html')));
}
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`CRMBench Modelo disponível em http://localhost:${port}`));

import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { openDatabase } from './db.js';

const clientDir = fileURLToPath(new URL('../client', import.meta.url));
const port = Number(process.env.PORT) || 3000;

const db = openDatabase();
const app = createApp(db, { clientDir });

const server = app.listen(port, () => {
  console.log(`CRMBench Modelo disponível em http://localhost:${port}`);
});

function shutdown(): void {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

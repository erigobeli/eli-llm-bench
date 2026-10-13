import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createDatabase } from './db.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dbPath = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.join(root, '.data', 'eli-llm-bench.sqlite');
const port = Number(process.env.PORT ?? 3000);
const db = createDatabase(dbPath);
const app = createApp(db);
const server = app.listen(port, () => console.log(`CRMBench Modelo disponível na porta ${port}.`));

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

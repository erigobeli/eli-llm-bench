import { resolve } from 'node:path';
import { createApp } from './app.js';
import { openDatabase } from './database.js';

const db = openDatabase();
const port = Number(process.env.PORT || 3000);
const app = createApp(db, resolve('dist/client'));
const server = app.listen(port, () => console.log(`CRMBench Modelo disponível em http://localhost:${port}`));
const shutdown = () => server.close(() => { db.close(); process.exit(0); });
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

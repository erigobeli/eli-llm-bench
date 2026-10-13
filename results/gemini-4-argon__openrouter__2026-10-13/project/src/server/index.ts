import { createApp } from './app.js';
import { getDb, closeDb } from './db/database.js';

const port = Number.parseInt(process.env.PORT || '3000', 10);

// Initialize DB connection on startup
getDb();

const app = createApp();

const server = app.listen(port, () => {
  console.log(`CRMBench Modelo rodando em http://localhost:${port}`);
});

function shutdown() {
  server.close(() => {
    closeDb();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

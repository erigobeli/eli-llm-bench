import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { openOrInitDatabase, resolveDbPath } from "./db.js";

const here = path.dirname(fileURLToPath(import.meta.url));
// Em produção este arquivo fica em dist/server; o frontend em dist/client.
const clientDir = path.resolve(here, "..", "client");

const port = Number(process.env.PORT) || 3000;
const dbPath = resolveDbPath(process.env.DB_PATH);
const db = openOrInitDatabase(dbPath);
const app = createApp(db, { clientDir });

const server = app.listen(port, () => {
  console.log(`CRMBench Modelo disponível em http://localhost:${port} (banco: ${dbPath})`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 2000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

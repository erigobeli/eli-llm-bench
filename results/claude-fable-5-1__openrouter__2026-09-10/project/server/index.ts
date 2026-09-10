import fs from "node:fs";
import path from "node:path";
import { createApp } from "./app";
import { createSchema, defaultSeedPath, loadSeed, openDatabase, resolveDbPath } from "./db";

const port = Number(process.env.PORT) || 3000;
const dbPath = resolveDbPath();
const isNewDatabase = !fs.existsSync(dbPath);

const db = openDatabase(dbPath);
createSchema(db);
if (isNewDatabase) {
  // Primeira execução sem `npm run db:setup`: carrega o seed para a aplicação iniciar com dados.
  const seedPath = defaultSeedPath();
  if (fs.existsSync(seedPath)) loadSeed(db, seedPath);
}

// Em produção este arquivo fica em dist/server/server/index.js; o frontend em dist/client.
const staticDir = path.resolve(__dirname, "..", "..", "client");
const app = createApp(db, { staticDir });

const server = app.listen(port, () => {
  console.log(`CRMBench Modelo em http://localhost:${port}`);
  console.log(`Banco: ${dbPath}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

import { createApp } from "./app";
import { openDb, resolveDbPath } from "./db";

const port = Number(process.env.PORT ?? 3000);
const db = openDb();
const app = createApp(db);

const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`CRMBench Modelo rodando em http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`Banco de dados: ${resolveDbPath()}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

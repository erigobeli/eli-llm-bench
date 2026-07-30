import path from "node:path";
import { createApp } from "./app";
import { migrate, openDatabase, resolveDbPath } from "./db";

function resolveWebRoot(): string {
  // dist/server/index.js -> dist/web
  return path.resolve(__dirname, "..", "web");
}

function main(): void {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error(`PORT inválida: ${String(process.env.PORT)}`);
    process.exit(1);
  }

  const dbPath = resolveDbPath(process.env.DB_PATH);
  const db = openDatabase(dbPath);
  migrate(db);

  const app = createApp(db, { webRoot: resolveWebRoot() });

  const server = app.listen(port, () => {
    console.log(`CRMBench Modelo em execução em http://localhost:${port}`);
    console.log(`Banco de dados: ${dbPath}`);
  });

  const shutdown = () => {
    server.close(() => {
      try {
        db.close();
      } catch {
        /* ignora */
      }
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();

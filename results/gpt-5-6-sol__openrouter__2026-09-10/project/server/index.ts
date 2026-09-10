import fs from "node:fs";
import path from "node:path";
import { createApp } from "./app.js";
import { defaultDbPath, openDatabase } from "./db.js";

const dbPath = defaultDbPath();
if (!fs.existsSync(dbPath)) {
  console.error(`Banco não encontrado em ${dbPath}. Execute npm run db:setup.`);
  process.exit(1);
}

const db = openDatabase(dbPath);
const port = Number(process.env.PORT || 3000);
const app = createApp(db, path.resolve("dist/client"));
const server = app.listen(port, () => console.log(`CRMBench Modelo em http://localhost:${port}`));

function shutdown() {
  server.close(() => { db.close(); process.exit(0); });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

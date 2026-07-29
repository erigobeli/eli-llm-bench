import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { createSchema, openDatabase, resolveDbPath } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const port = Number(process.env.PORT) || 3000;
const dbPath = resolveDbPath();

const db = openDatabase(dbPath);
createSchema(db);

const staticCandidates = [
  path.resolve(__dirname, "../client"),
  path.resolve(__dirname, "../../dist/client"),
  path.resolve(process.cwd(), "dist/client")
];
const staticDir = staticCandidates.find(
  (dir) => fs.existsSync(path.join(dir, "index.html"))
);

const app = createApp(db, staticDir);

app.listen(port, () => {
  console.log(`CRMBench Modelo disponível em http://localhost:${port}`);
});

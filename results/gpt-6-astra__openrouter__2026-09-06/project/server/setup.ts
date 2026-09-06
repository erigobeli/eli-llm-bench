import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSchema, openDatabase } from "./database.js";
import type { Client, Deal } from "../shared/types.js";

const raw = readFileSync(resolve("seed-data.json"));
const expected =
  "6dd8f6d95f75404f8e1dc75088141913c2c9ac334168a27ffbf9a86b7596c522";
if (createHash("sha256").update(raw).digest("hex") !== expected) {
  throw new Error(
    "O seed diverge do SHA-256 esperado. Nenhum dado foi alterado.",
  );
}
const seed = JSON.parse(raw.toString("utf8")) as {
  clients: Client[];
  deals: Deal[];
};
const db = openDatabase();
try {
  db.transaction(() => {
    db.exec("DROP TABLE IF EXISTS deals; DROP TABLE IF EXISTS clients;");
    createSchema(db);
    const client =
      db.prepare(`INSERT INTO clients (id, name, email, company, createdAt, updatedAt)
      VALUES (@id, @name, @email, @company, @createdAt, @updatedAt)`);
    const deal =
      db.prepare(`INSERT INTO deals (id, title, valueInCents, clientId, stage, createdAt, updatedAt)
      VALUES (@id, @title, @valueInCents, @clientId, @stage, @createdAt, @updatedAt)`);
    for (const row of seed.clients) client.run(row);
    for (const row of seed.deals) deal.run(row);
  })();
  console.log(
    `Banco recriado: ${seed.clients.length} clientes e ${seed.deals.length} negocios. Seed SHA-256 verificado.`,
  );
} finally {
  db.close();
}

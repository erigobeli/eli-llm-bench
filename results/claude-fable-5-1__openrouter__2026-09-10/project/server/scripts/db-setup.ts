import path from "node:path";
import { defaultSeedPath, resetDatabase, resolveDbPath } from "../db";

const dbPath = resolveDbPath();
const seedPath = defaultSeedPath();

const db = resetDatabase(dbPath, seedPath);
const clients = (db.prepare("SELECT COUNT(*) AS n FROM clients").get() as { n: number }).n;
const deals = (db.prepare("SELECT COUNT(*) AS n FROM deals").get() as { n: number }).n;
db.close();

console.log(`Banco recriado em ${path.relative(process.cwd(), dbPath) || dbPath}`);
console.log(`Seed carregado: ${clients} clientes, ${deals} negócios.`);

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSchema,
  loadSeed,
  openDatabase,
  resolveDbPath,
  type SeedData
} from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findSeedFile(): string {
  const candidates = [
    path.resolve(process.cwd(), "seed-data.json"),
    path.resolve(__dirname, "../../seed-data.json"),
    path.resolve(__dirname, "../../../seed-data.json")
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("Arquivo seed-data.json não encontrado.");
}

function main(): void {
  const dbPath = resolveDbPath();
  const resolved = path.resolve(dbPath);

  // Recria o banco do zero (remove arquivo e artefatos WAL).
  for (const suffix of ["", "-wal", "-shm"]) {
    const file = `${resolved}${suffix}`;
    if (fs.existsSync(file)) fs.rmSync(file);
  }

  const seedFile = findSeedFile();
  const seed = JSON.parse(fs.readFileSync(seedFile, "utf8")) as SeedData;

  const db = openDatabase(dbPath);
  try {
    createSchema(db);
    loadSeed(db, seed);
    const clients = (db.prepare("SELECT COUNT(*) AS c FROM clients").get() as { c: number }).c;
    const deals = (db.prepare("SELECT COUNT(*) AS c FROM deals").get() as { c: number }).c;
    console.log(`Banco recriado em ${resolved}`);
    console.log(`Seed carregado: ${clients} clientes e ${deals} negócios.`);
  } finally {
    db.close();
  }
}

main();

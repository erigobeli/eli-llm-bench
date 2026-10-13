import { readFileSync, rmSync } from 'node:fs';
import { openDatabase, resolveDbPath, SEED_PATH, seedDatabase, type SeedFile } from './db.js';

const dbPath = resolveDbPath();

for (const suffix of ['', '-wal', '-shm', '-journal']) {
  rmSync(`${dbPath}${suffix}`, { force: true });
}

const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8').replace(/^\uFEFF/, '')) as SeedFile;
const db = openDatabase(dbPath);
try {
  const result = seedDatabase(db, seed);
  console.log(`Banco preparado em ${dbPath}: ${result.clients} clientes e ${result.deals} negócios carregados.`);
} finally {
  db.close();
}

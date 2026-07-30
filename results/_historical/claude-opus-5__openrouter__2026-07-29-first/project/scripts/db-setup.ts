/**
 * Recria o banco SQLite, aplica o schema e carrega o seed imutável.
 * Uso: npm run db:setup
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  loadSeed,
  openDatabase,
  removeDatabaseFiles,
  resolveDbPath,
  type SeedFile,
} from '../src/server/db';

function findSeedFile(): string {
  const candidates = [
    path.resolve(process.cwd(), 'seed-data.json'),
    path.resolve(__dirname, '..', 'seed-data.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error('Arquivo seed-data.json não encontrado.');
}

function main(): void {
  const dbPath = resolveDbPath(process.env.DB_PATH);
  const seedPath = findSeedFile();
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as SeedFile;

  removeDatabaseFiles(dbPath);

  const db = openDatabase(dbPath);
  loadSeed(db, seed);

  const clients = (db.prepare('SELECT COUNT(*) AS total FROM clients').get() as any).total;
  const deals = (db.prepare('SELECT COUNT(*) AS total FROM deals').get() as any).total;
  db.close();

  console.log(`Banco recriado em: ${dbPath}`);
  console.log(`Clientes carregados: ${clients}`);
  console.log(`Negócios carregados: ${deals}`);
}

main();

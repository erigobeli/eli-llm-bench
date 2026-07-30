import { openDatabase, removeDatabaseFiles, resolveDbPath } from './db';
import { seedDatabase } from './seed';

function main(): void {
  const target = resolveDbPath();
  console.log(`[db:setup] Recriando o banco em ${target}`);

  removeDatabaseFiles();

  const db = openDatabase();
  try {
    seedDatabase(db);
    const clients = (db.prepare('SELECT COUNT(*) AS t FROM clients').get() as { t: number }).t;
    const deals = (db.prepare('SELECT COUNT(*) AS t FROM deals').get() as { t: number }).t;
    console.log(`[db:setup] Seed carregado: ${clients} clientes e ${deals} negócios.`);
  } finally {
    db.close();
  }

  console.log('[db:setup] Concluído.');
}

main();

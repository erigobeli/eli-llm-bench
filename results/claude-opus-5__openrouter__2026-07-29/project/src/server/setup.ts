import { dropDatabaseFiles, migrate, openDatabase, resolveDbPath } from "./db";
import { Repository } from "./repository";
import { readSeedFile, resolveSeedPath, seedDatabase } from "./seed";

function main(): void {
  const dbPath = resolveDbPath(process.env.DB_PATH);
  const seedPath = resolveSeedPath();

  console.log(`Recriando banco de dados em ${dbPath}`);
  dropDatabaseFiles(dbPath);

  const db = openDatabase(dbPath);
  try {
    migrate(db);
    const seed = readSeedFile(seedPath);
    seedDatabase(db, seed);

    const metrics = new Repository(db).dashboard();
    console.log(`Seed carregado de ${seedPath}`);
    console.log(
      `Clientes: ${metrics.totalClients} | Negócios abertos: ${metrics.openDeals} | ` +
        `Pipeline aberto: ${metrics.pipelineValueInCents} centavos`,
    );
    console.log("Banco de dados pronto.");
  } finally {
    db.close();
  }
}

try {
  main();
} catch (error) {
  console.error("Falha ao preparar o banco de dados.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

import { resetAndSeedDatabase, resolveDbPath } from './database.js';

const dbPath = resolveDbPath();
resetAndSeedDatabase(dbPath);
console.log(`Banco de dados configurado e populado com sucesso em: ${dbPath}`);

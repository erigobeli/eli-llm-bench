import { defaultDbPath, recreateDatabase } from './db.js';

recreateDatabase();
console.log(`Banco preparado em ${defaultDbPath()}`);

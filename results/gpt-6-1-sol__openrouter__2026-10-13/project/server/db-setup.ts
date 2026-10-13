import { setupDatabase } from './database.js';

const result = setupDatabase();
console.log(`Banco recriado com ${result.clients} clientes e ${result.deals} negócios. Seed verificado.`);

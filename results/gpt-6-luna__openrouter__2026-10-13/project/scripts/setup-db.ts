import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupDatabase } from '../src/server/db.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.join(root, '.data', 'eli-llm-bench.sqlite');
setupDatabase(target, path.join(root, 'seed-data.json'));
console.log(`Banco recriado e seed carregado: ${target}`);

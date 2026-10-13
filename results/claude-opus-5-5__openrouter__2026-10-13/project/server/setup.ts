import { resolveDbPath, setupDatabase } from "./db.js";

const dbPath = resolveDbPath(process.env.DB_PATH);
setupDatabase(dbPath);
console.log(`Banco recriado com o seed em ${dbPath}`);

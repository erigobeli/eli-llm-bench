import { createApp } from './app.js';
import { createSchema, openDatabase } from './database.js';

const db = openDatabase();
createSchema(db);
const port = Number(process.env.PORT || 3000);
const server = createApp(db, true).listen(port, () => console.log(`CRMBench Modelo em http://localhost:${port}`));
const shutdown = () => server.close(() => { db.close(); process.exit(0); });
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

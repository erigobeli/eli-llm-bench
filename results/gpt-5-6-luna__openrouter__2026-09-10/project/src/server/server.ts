import { createApp } from './app.js';
import { createDatabase } from './db.js';

const port = Number(process.env.PORT || 3000);
const db = createDatabase();
const app = createApp(db);
app.listen(port, () => console.log(`CRMBench Modelo em http://localhost:${port}`));

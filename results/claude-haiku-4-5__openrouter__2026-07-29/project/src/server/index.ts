import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, getDb } from './db';
import { createClientsRouter } from './routes/clients';
import { createDealsRouter } from './routes/deals';
import { createDashboardRouter } from './routes/dashboard';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initDb();

// Middleware
app.use(express.json());

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api/clients', createClientsRouter());
app.use('/api/deals', createDealsRouter());
app.use('/api/dashboard', createDashboardRouter());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Serve index.html for all non-API routes
app.get(/^(?!\/api).*$/, (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

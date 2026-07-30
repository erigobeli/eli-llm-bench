import { createApp } from './app';
import { openDatabase, resolveDbPath } from './db';

const port = Number(process.env.PORT ?? 3000);
const db = openDatabase();
const app = createApp(db);

const server = app.listen(port, () => {
  console.log(`CRMBench Modelo em execução na porta ${port}`);
  console.log(`Banco de dados: ${resolveDbPath()}`);
});

function shutdown(signal: string): void {
  console.log(`\nRecebido ${signal}, encerrando...`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

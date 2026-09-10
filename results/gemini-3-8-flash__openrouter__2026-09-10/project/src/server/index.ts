import { createApp } from './app.js';

const PORT = parseInt(process.env.PORT || '3000', 10);

const app = createApp();

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`CRMBench Modelo executando na porta ${PORT}`);
});

process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

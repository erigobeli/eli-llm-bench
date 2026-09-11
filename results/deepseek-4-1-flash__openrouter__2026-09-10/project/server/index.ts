import { createApp } from './app';

const port = Number.parseInt(process.env.PORT ?? '', 10) || 3000;
const app = createApp();

app.listen(port, () => {
  console.log(`CRMBench Modelo ouvindo em http://localhost:${port}`);
});

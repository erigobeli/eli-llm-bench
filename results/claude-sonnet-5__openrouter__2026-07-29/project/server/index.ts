import { createApp } from "./app.js";

const port = process.env.PORT && process.env.PORT.trim().length > 0 ? Number(process.env.PORT) : 3000;
const app = createApp();

app.listen(port, () => {
  console.log(`CRMBench Modelo rodando em http://localhost:${port}`);
});

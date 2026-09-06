import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { createSchema, openDatabase } from "./database.js";

const db = openDatabase();
createSchema(db);
const app = createApp(
  db,
  fileURLToPath(new URL("../public/", import.meta.url)),
);
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => {
  const address = server.address();
  console.log(
    `CRMBench Modelo: http://localhost:${typeof address === "object" && address ? address.port : port}`,
  );
});
server.on("error", (error) => {
  console.error("Nao foi possivel iniciar o servidor:", error.message);
  db.close();
  process.exitCode = 1;
});
function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
  server.closeIdleConnections();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

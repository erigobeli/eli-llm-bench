import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import request from "supertest";

const TEST_DB_PATH = path.resolve(process.cwd(), ".data", `test-${Date.now()}.sqlite`);

function removeIfExists(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath);
  }
}

beforeAll(async () => {
  process.env.DB_PATH = TEST_DB_PATH;

  const dir = path.dirname(TEST_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  removeIfExists(TEST_DB_PATH);

  const { getDb } = await import("../server/db.js");
  const { SCHEMA_SQL } = await import("../server/schema.js");
  const db = getDb();
  db.exec(SCHEMA_SQL);
});

afterAll(async () => {
  const { closeDb } = await import("../server/db.js");
  closeDb();
  removeIfExists(TEST_DB_PATH);
  for (const suffix of ["-wal", "-shm"]) {
    removeIfExists(`${TEST_DB_PATH}${suffix}`);
  }
});

describe("CRMBench Modelo API", () => {
  it("responde 200 { status: ok } em /api/health", async () => {
    const { createApp } = await import("../server/app.js");
    const app = createApp();

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("cria um cliente válido e persiste nome, e-mail e empresa", async () => {
    const { createApp } = await import("../server/app.js");
    const app = createApp();

    const response = await request(app)
      .post("/api/clients")
      .send({ name: "  Cliente Teste  ", email: "  Cliente.Teste@Example.com  ", company: "Empresa Teste" });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe("Cliente Teste");
    expect(response.body.email.trim()).toBe(response.body.email);
    expect(response.body.company).toBe("Empresa Teste");
    expect(response.body.id).toBeTypeOf("number");
    expect(response.body.createdAt).toBeTypeOf("string");
  });

  it("cria um negócio relacionado a um cliente existente", async () => {
    const { createApp } = await import("../server/app.js");
    const app = createApp();

    const clientResponse = await request(app)
      .post("/api/clients")
      .send({ name: "Cliente Para Negócio", email: "cliente-negocio@example.com", company: null });
    expect(clientResponse.status).toBe(201);
    const clientId = clientResponse.body.id;

    const dealResponse = await request(app).post("/api/deals").send({
      title: "Negócio de Teste",
      valueInCents: 15000,
      clientId,
      stage: "new"
    });

    expect(dealResponse.status).toBe(201);
    expect(dealResponse.body.clientId).toBe(clientId);
    expect(dealResponse.body.stage).toBe("new");
    expect(dealResponse.body.valueInCents).toBe(15000);
  });

  it("persiste a mudança de etapa de um negócio após reiniciar a conexão com o banco", async () => {
    const { createApp } = await import("../server/app.js");
    const app = createApp();

    const clientResponse = await request(app)
      .post("/api/clients")
      .send({ name: "Cliente Pipeline", email: "cliente-pipeline@example.com" });
    const clientId = clientResponse.body.id;

    const dealResponse = await request(app).post("/api/deals").send({
      title: "Negócio Pipeline",
      valueInCents: 30000,
      clientId,
      stage: "new"
    });
    const dealId = dealResponse.body.id;

    const patchResponse = await request(app).patch(`/api/deals/${dealId}`).send({ stage: "proposal" });
    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.stage).toBe("proposal");
    expect(patchResponse.body.updatedAt).not.toBe(dealResponse.body.updatedAt);

    const { closeDb, getDb } = await import("../server/db.js");
    closeDb();
    getDb();

    const { createApp: createAppAgain } = await import("../server/app.js");
    const appAfterRestart = createAppAgain();
    const getResponse = await request(appAfterRestart).get(`/api/deals?clientId=${clientId}`);

    expect(getResponse.status).toBe(200);
    const persistedDeal = getResponse.body.data.find((deal: { id: number }) => deal.id === dealId);
    expect(persistedDeal).toBeDefined();
    expect(persistedDeal.stage).toBe("proposal");
  });
});

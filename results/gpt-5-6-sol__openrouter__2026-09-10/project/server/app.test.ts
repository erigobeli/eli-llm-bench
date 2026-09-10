import Database from "better-sqlite3";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createSchema, type AppDatabase } from "./db.js";

describe("API do CRMBench Modelo", () => {
  let db: AppDatabase;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    createSchema(db);
    app = createApp(db);
  });

  afterEach(() => db.close());

  it("responde ao health check", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("cria e persiste um cliente normalizado", async () => {
    const response = await request(app).post("/api/clients").send({
      name: "  Clínica Saúde  ",
      email: "  contato@teste.com.br  ",
      company: "  Teste Ltda  "
    });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: "Clínica Saúde", email: "contato@teste.com.br", company: "Teste Ltda" });
    expect(db.prepare("SELECT COUNT(*) AS count FROM clients").get()).toEqual({ count: 1 });
    const search = await request(app).get("/api/clients?search=SAÚDE");
    expect(search.body.data).toHaveLength(1);
  });

  it("cria um negócio relacionado a um cliente", async () => {
    const client = await request(app).post("/api/clients").send({ name: "Cliente Teste", email: "cliente@teste.com" });
    const response = await request(app).post("/api/deals").send({
      title: "Novo contrato",
      valueInCents: 125000,
      clientId: client.body.id,
      stage: "new"
    });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ clientId: client.body.id, valueInCents: 125000, stage: "new" });
  });

  it("persiste a mudança de etapa de um negócio", async () => {
    const client = await request(app).post("/api/clients").send({ name: "Cliente Teste", email: "cliente@teste.com" });
    const deal = await request(app).post("/api/deals").send({ title: "Proposta", valueInCents: 9900, clientId: client.body.id, stage: "new" });
    const response = await request(app).patch(`/api/deals/${deal.body.id}`).send({ stage: "proposal" });
    expect(response.status).toBe(200);
    expect(response.body.stage).toBe("proposal");
    expect((db.prepare("SELECT stage FROM deals WHERE id = ?").get(deal.body.id) as { stage: string }).stage).toBe("proposal");
  });
});

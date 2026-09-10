import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp } from "./app";
import { createSchema, defaultSeedPath, openDatabase, resetDatabase, type DB } from "./db";

let db: DB;
let app: ReturnType<typeof createApp>;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crmbench-test-"));
const dbPath = path.join(tmpDir, "test.sqlite");

beforeAll(() => {
  db = resetDatabase(dbPath, defaultSeedPath());
  app = createApp(db);
});

afterAll(() => {
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("API", () => {
  it("GET /api/health responde ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("seed produz os indicadores esperados", async () => {
    const res = await request(app).get("/api/dashboard");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ totalClients: 5, openDeals: 6, pipelineValueInCents: 1010000 });
  });

  it("cria cliente com trim e e-mail único sem diferenciar maiúsculas", async () => {
    const created = await request(app)
      .post("/api/clients")
      .send({ name: "  Empresa Teste  ", email: "  Teste@Exemplo.com ", company: "  ACME  " });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: "Empresa Teste", email: "Teste@Exemplo.com", company: "ACME" });
    expect(typeof created.body.id).toBe("number");

    const dup = await request(app)
      .post("/api/clients")
      .send({ name: "Outra", email: "teste@exemplo.com" });
    expect(dup.status).toBe(409);
    expect(typeof dup.body.error).toBe("string");

    const invalid = await request(app).post("/api/clients").send({ name: "A", email: "sem-arroba" });
    expect(invalid.status).toBe(400);

    const list = await request(app).get("/api/clients").query({ search: "empresa teste", pageSize: 4 });
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.pagination).toEqual({ page: 1, pageSize: 4, total: 1, totalPages: 1 });
  });

  it("cria negócio relacionado a um cliente e rejeita cliente inexistente", async () => {
    const client = await request(app)
      .post("/api/clients")
      .send({ name: "Cliente Negócio", email: "negocio@exemplo.com" });
    expect(client.status).toBe(201);

    const deal = await request(app)
      .post("/api/deals")
      .send({ title: "Implantação", valueInCents: 12345, clientId: client.body.id, stage: "contact" });
    expect(deal.status).toBe(201);
    expect(deal.body).toMatchObject({
      title: "Implantação",
      valueInCents: 12345,
      clientId: client.body.id,
      stage: "contact",
    });

    const byClient = await request(app).get("/api/deals").query({ clientId: client.body.id });
    expect(byClient.body.data).toHaveLength(1);
    expect(byClient.body.data[0].id).toBe(deal.body.id);

    const invalidClient = await request(app)
      .post("/api/deals")
      .send({ title: "Sem cliente", valueInCents: 100, clientId: 99999 });
    expect(invalidClient.status).toBe(400);

    const invalidStage = await request(app)
      .post("/api/deals")
      .send({ title: "Etapa ruim", valueInCents: 100, clientId: client.body.id, stage: "lost" });
    expect(invalidStage.status).toBe(400);

    // cliente com negócio não pode ser excluído
    const del = await request(app).delete(`/api/clients/${client.body.id}`);
    expect(del.status).toBe(409);
  });

  it("mudança de etapa persiste no SQLite após reabrir o banco", async () => {
    const before = await request(app).get("/api/deals/1");
    expect(before.body.stage).toBe("new");

    const patched = await request(app).patch("/api/deals/1").send({ stage: "proposal" });
    expect(patched.status).toBe(200);
    expect(patched.body.stage).toBe("proposal");
    expect(patched.body.updatedAt).not.toBe(before.body.updatedAt);

    // Fecha e reabre o arquivo para simular reinício do servidor.
    db.close();
    db = openDatabase(dbPath);
    createSchema(db);
    app = createApp(db);

    const after = await request(app).get("/api/deals/1");
    expect(after.status).toBe(200);
    expect(after.body.stage).toBe("proposal");
    expect(after.body.title).toBe("Site institucional");
  });
});

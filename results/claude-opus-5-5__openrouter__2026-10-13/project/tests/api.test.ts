import fs from "node:fs";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../server/app.js";
import { openDatabase, setupDatabase, type DB } from "../server/db.js";

const dbPath = path.resolve(process.cwd(), ".data", `test-${process.pid}.sqlite`);
let db: DB;
let app: ReturnType<typeof createApp>;

function cleanup() {
  for (const s of ["", "-wal", "-shm"]) fs.rmSync(dbPath + s, { force: true });
}

beforeEach(() => {
  if (db?.open) db.close();
  setupDatabase(dbPath);
  db = openDatabase(dbPath);
  app = createApp(db);
});

afterAll(() => {
  if (db?.open) db.close();
  cleanup();
});

describe("API CRMBench Modelo", () => {
  it("GET /api/health responde status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("carrega o seed e calcula os indicadores", async () => {
    const res = await request(app).get("/api/dashboard");
    expect(res.body).toEqual({ totalClients: 5, openDeals: 6, pipelineValueInCents: 1010000 });
  });

  it("cria cliente com trim e rejeita e-mail duplicado sem diferenciar maiúsculas", async () => {
    const res = await request(app)
      .post("/api/clients")
      .send({ name: "  Ana Souza  ", email: "  Ana@Exemplo.com ", company: "  ACME  " });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Ana Souza", email: "Ana@Exemplo.com", company: "ACME" });
    expect(typeof res.body.id).toBe("number");

    const dup = await request(app).post("/api/clients").send({ name: "Outra", email: "ana@exemplo.COM" });
    expect(dup.status).toBe(409);
    expect(typeof dup.body.error).toBe("string");

    const list = await request(app).get("/api/clients?search=ana%20souza");
    expect(list.body.pagination.total).toBe(1);

    const invalid = await request(app).post("/api/clients").send({ name: "A", email: "x" });
    expect(invalid.status).toBe(400);
  });

  it("cria negócio relacionado a um cliente existente", async () => {
    const client = await request(app).post("/api/clients").send({ name: "Bruno Lima", email: "bruno@exemplo.com" });
    expect(client.body.company).toBeNull();
    const res = await request(app)
      .post("/api/deals")
      .send({ title: "Contrato anual", valueInCents: 250000, clientId: client.body.id, stage: "proposal" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: "Contrato anual", valueInCents: 250000, clientId: client.body.id, stage: "proposal" });

    const related = await request(app).get(`/api/deals?clientId=${client.body.id}`);
    expect(related.body.data).toHaveLength(1);

    const invalid = await request(app).post("/api/deals").send({ title: "X", valueInCents: -1, clientId: 9999, stage: "foo" });
    expect(invalid.status).toBe(400);

    const blocked = await request(app).delete(`/api/clients/${client.body.id}`);
    expect(blocked.status).toBe(409);
  });

  it("persiste a mudança de etapa no SQLite após reabrir o banco", async () => {
    const before = await request(app).get("/api/deals?stage=new&pageSize=50");
    const deal = before.body.data[0];
    const res = await request(app).patch(`/api/deals/${deal.id}`).send({ stage: "won" });
    expect(res.status).toBe(200);
    expect(res.body.stage).toBe("won");
    expect(res.body.title).toBe(deal.title);
    expect(res.body.updatedAt).not.toBe(deal.updatedAt);

    db.close();
    db = openDatabase(dbPath);
    app = createApp(db);
    const after = await request(app).get(`/api/deals/${deal.id}`);
    expect(after.body.stage).toBe("won");

    const metrics = await request(app).get("/api/dashboard");
    expect(metrics.body.openDeals).toBe(5);
    expect(metrics.body.pipelineValueInCents).toBe(1010000 - deal.valueInCents);
  });

  it("pagina e filtra negócios", async () => {
    const res = await request(app).get("/api/deals?pageSize=4&page=2");
    expect(res.body.data).toHaveLength(4);
    expect(res.body.pagination).toEqual({ page: 2, pageSize: 4, total: 8, totalPages: 2 });
    const combo = await request(app).get("/api/deals?clientId=1&stage=proposal");
    expect(combo.body.data.map((d: { id: number }) => d.id)).toEqual([6]);
  });
});

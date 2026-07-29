import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openDb } from "../server/db";
import { createApp } from "../server/app";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crmbench-test-"));
const dbFile = path.join(tmpDir, "test.sqlite");

let db = openDb(dbFile);
let app = createApp(db);

afterAll(() => {
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("CRMBench Modelo API", () => {
  it("health responde 200 com status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("cria um cliente válido normalizando espaços", async () => {
    const res = await request(app)
      .post("/api/clients")
      .send({ name: "  Ana Lima  ", email: "ana@example.com", company: "  Acme  " });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Ana Lima");
    expect(res.body.email).toBe("ana@example.com");
    expect(res.body.company).toBe("Acme");
    expect(typeof res.body.id).toBe("number");
  });

  it("cria um negócio relacionado a um cliente existente", async () => {
    const client = await request(app)
      .post("/api/clients")
      .send({ name: "Bravo Ltda", email: "bravo@example.com", company: null });
    expect(client.status).toBe(201);

    const deal = await request(app).post("/api/deals").send({
      title: "Implantação",
      valueInCents: 250000,
      clientId: client.body.id,
      stage: "new",
    });
    expect(deal.status).toBe(201);
    expect(deal.body.clientId).toBe(client.body.id);
    expect(deal.body.valueInCents).toBe(250000);
    expect(deal.body.stage).toBe("new");
  });

  it("persiste a mudança de etapa no SQLite após reabrir o banco", async () => {
    const client = await request(app)
      .post("/api/clients")
      .send({ name: "Carlos", email: "carlos@example.com", company: null });
    const deal = await request(app).post("/api/deals").send({
      title: "Contrato anual",
      valueInCents: 100000,
      clientId: client.body.id,
      stage: "new",
    });

    const patch = await request(app)
      .patch(`/api/deals/${deal.body.id}`)
      .send({ stage: "won" });
    expect(patch.status).toBe(200);
    expect(patch.body.stage).toBe("won");

    // Reabre a conexão para provar persistência em disco.
    db.close();
    db = openDb(dbFile);
    app = createApp(db);

    const list = await request(app).get(`/api/deals?clientId=${client.body.id}`);
    const persisted = list.body.data.find((d: any) => d.id === deal.body.id);
    expect(persisted.stage).toBe("won");
  });
});

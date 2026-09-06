import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { createApp } from "../server/app.js";
import { createSchema, openDatabase } from "../server/database.js";

let dir: string;
let db: ReturnType<typeof openDatabase>;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  mkdirSync(resolve(".data"), { recursive: true });
  dir = mkdtempSync(resolve(".data/test-"));
  db = openDatabase(join(dir, "test.sqlite"));
  createSchema(db);
  app = createApp(db);
});
afterEach(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

const clientData = {
  name: "  Maria Silva  ",
  email: "  MARIA@EXAMPLE.COM  ",
  company: "  Empresa  ",
};
async function client() {
  return (await request(app).post("/api/clients").send(clientData).expect(201))
    .body;
}
async function deal(clientId: number) {
  return (
    await request(app)
      .post("/api/deals")
      .send({
        title: "Projeto CRM",
        valueInCents: 123456,
        clientId,
        stage: "new",
      })
      .expect(201)
  ).body;
}

describe("API e persistencia SQLite", () => {
  it("health retorna o contrato JSON", async () => {
    expect((await request(app).get("/api/health").expect(200)).body).toEqual({
      status: "ok",
    });
  });

  it("cria cliente normalizado, persiste e bloqueia e-mail duplicado sem diferenciar caixa", async () => {
    const created = await client();
    expect(created).toMatchObject({
      name: "Maria Silva",
      email: "maria@example.com",
      company: "Empresa",
    });
    expect(new Date(created.createdAt).toISOString()).toBe(created.createdAt);
    expect(
      (await request(app).get("/api/clients").expect(200)).body.data,
    ).toEqual([created]);
    await request(app)
      .post("/api/clients")
      .send({ ...clientData, email: "Maria@Example.com" })
      .expect(409);
    expect(db.prepare("SELECT COUNT(*) AS n FROM clients").get()).toEqual({
      n: 1,
    });
  });

  it("cria negocio relacionado e calcula indicadores a partir do banco", async () => {
    const person = await client();
    const created = await deal(person.id);
    expect(created).toMatchObject({
      clientId: person.id,
      stage: "new",
      valueInCents: 123456,
    });
    expect((await request(app).get("/api/dashboard")).body).toEqual({
      totalClients: 1,
      openDeals: 1,
      pipelineValueInCents: 123456,
    });
    await request(app)
      .patch(`/api/deals/${created.id}`)
      .send({ stage: "won" })
      .expect(200);
    expect((await request(app).get("/api/dashboard")).body).toEqual({
      totalClients: 1,
      openDeals: 0,
      pipelineValueInCents: 0,
    });
  });

  it("persiste mudanca de etapa ao fechar e reabrir o SQLite", async () => {
    const created = await deal((await client()).id);
    const updated = (
      await request(app)
        .patch(`/api/deals/${created.id}`)
        .send({ stage: "proposal" })
        .expect(200)
    ).body;
    expect(updated.updatedAt > created.updatedAt).toBe(true);
    expect(updated.title).toBe(created.title);
    db.close();
    db = openDatabase(join(dir, "test.sqlite"));
    app = createApp(db);
    expect((await request(app).get("/api/deals")).body.data[0].stage).toBe(
      "proposal",
    );
  });

  it("preserva campos ausentes, trata empresa opcional e atualiza data", async () => {
    const created = await client();
    const updated = (
      await request(app)
        .patch(`/api/clients/${created.id}`)
        .send({ name: "  Maria Costa " })
        .expect(200)
    ).body;
    expect(updated).toMatchObject({
      name: "Maria Costa",
      email: created.email,
      company: created.company,
      createdAt: created.createdAt,
    });
    expect(updated.updatedAt > created.updatedAt).toBe(true);
    const noCompany = (
      await request(app)
        .post("/api/clients")
        .send({ name: "Joana", email: "joana@example.com" })
        .expect(201)
    ).body;
    expect(noCompany.company).toBeNull();
  });

  it("impede exclusao em cascata e exclui somente registros solicitados", async () => {
    const person = await client();
    const first = await deal(person.id);
    const second = await deal(person.id);
    await request(app).delete(`/api/clients/${person.id}`).expect(409);
    await request(app).delete(`/api/deals/${first.id}`).expect(204);
    expect(
      (await request(app).get("/api/deals")).body.data.map(
        (d: { id: number }) => d.id,
      ),
    ).toEqual([second.id]);
    await request(app).delete(`/api/deals/${second.id}`).expect(204);
    await request(app).delete(`/api/clients/${person.id}`).expect(204);
    await request(app)
      .patch(`/api/clients/${person.id}`)
      .send({ name: "Teste" })
      .expect(404);
  });

  it("combina filtros, busca sem caixa e paginacao correta", async () => {
    const person = await client();
    for (let i = 0; i < 5; i++) await deal(person.id);
    await request(app)
      .post("/api/deals")
      .send({
        title: "Outro projeto",
        valueInCents: 0,
        clientId: person.id,
        stage: "won",
      })
      .expect(201);
    const listed = (
      await request(app)
        .get(
          `/api/deals?search=PROJETO&stage=new&clientId=${person.id}&page=2&pageSize=4`,
        )
        .expect(200)
    ).body;
    expect(listed.data).toHaveLength(1);
    expect(listed.pagination).toEqual({
      page: 2,
      pageSize: 4,
      total: 5,
      totalPages: 2,
    });
    expect(
      (await request(app).get("/api/clients?search=EMPRESA&pageSize=4")).body
        .pagination.total,
    ).toBe(1);
    await request(app).get("/api/deals?pageSize=51").expect(400);
    await request(app).get("/api/clients?page=0").expect(400);
    await request(app).get("/api/deals?stage=invalid").expect(400);
  });

  it("rejeita dados invalidos sem gravar e devolve apenas error em portugues", async () => {
    const person = await client();
    const valid = {
      title: "Valido",
      valueInCents: 100,
      clientId: person.id,
      stage: "new",
    };
    for (const invalid of [
      { title: " " },
      { valueInCents: -1 },
      { valueInCents: 1.5 },
      { stage: "closed" },
      { clientId: 999 },
      { clientId: "1" },
    ]) {
      const response = await request(app)
        .post("/api/deals")
        .send({ ...valid, ...invalid })
        .expect(400);
      expect(Object.keys(response.body)).toEqual(["error"]);
      expect(typeof response.body.error).toBe("string");
    }
    await request(app)
      .post("/api/clients")
      .send({ name: "A", email: "invalid" })
      .expect(400);
    expect((await request(app).get("/api/deals")).body.pagination.total).toBe(
      0,
    );
    await request(app)
      .post("/api/clients")
      .set("Content-Type", "application/json")
      .send("{bad")
      .expect(400);
    for (const resource of ["clients", "deals"]) {
      const response = await request(app)
        .post(`/api/${resource}`)
        .send([])
        .expect(400);
      expect(response.body).toEqual({ error: "Envie um objeto JSON válido." });
    }
  });

  it("mantem o seed original e os indicadores de referencia", async () => {
    const raw = readFileSync(resolve("seed-data.json"));
    expect(createHash("sha256").update(raw).digest("hex")).toBe(
      "6dd8f6d95f75404f8e1dc75088141913c2c9ac334168a27ffbf9a86b7596c522",
    );
    const seed = JSON.parse(raw.toString());
    for (const row of seed.clients)
      db.prepare(
        "INSERT INTO clients VALUES (@id, @name, @email, @company, @createdAt, @updatedAt)",
      ).run(row);
    for (const row of seed.deals)
      db.prepare(
        "INSERT INTO deals VALUES (@id, @title, @valueInCents, @clientId, @stage, @createdAt, @updatedAt)",
      ).run(row);
    expect((await request(app).get("/api/dashboard")).body).toEqual({
      totalClients: 5,
      openDeals: 6,
      pipelineValueInCents: 1010000,
    });
  });
});

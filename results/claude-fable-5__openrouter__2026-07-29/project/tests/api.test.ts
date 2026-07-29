import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import Database from "better-sqlite3";
import { createApp } from "../src/server/app";
import { createSchema, loadSeed, openDatabase, type SeedData } from "../src/server/db";

const seedPath = path.resolve(__dirname, "../seed-data.json");
const seed = JSON.parse(fs.readFileSync(seedPath, "utf8")) as SeedData;

let tmpDir: string;
let dbPath: string;
let db: Database.Database;
let server: Server;
let baseUrl: string;

function startServer(database: Database.Database): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const app = createApp(database);
    const srv = app.listen(0, () => {
      const { port } = srv.address() as AddressInfo;
      resolve({ server: srv, url: `http://127.0.0.1:${port}` });
    });
  });
}

function stopServer(srv: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    srv.close((err) => (err ? reject(err) : resolve()));
  });
}

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "crmbench-test-"));
  dbPath = path.join(tmpDir, "test.sqlite");
  db = openDatabase(dbPath);
  createSchema(db);
  loadSeed(db, seed);
  const started = await startServer(db);
  server = started.server;
  baseUrl = started.url;
});

afterAll(async () => {
  await stopServer(server);
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("API do CRMBench Modelo", () => {
  it("responde ao health check com status ok", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("expõe os indicadores do seed", async () => {
    const res = await fetch(`${baseUrl}/api/dashboard`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      totalClients: 5,
      openDeals: 6,
      pipelineValueInCents: 1010000
    });
  });

  it("cria um cliente válido com espaços removidos", async () => {
    const res = await fetch(`${baseUrl}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "  Teste Cliente  ",
        email: "  teste@exemplo.com.br ",
        company: "  Empresa Teste  "
      })
    });
    expect(res.status).toBe(201);
    const client = await res.json();
    expect(client.name).toBe("Teste Cliente");
    expect(client.email).toBe("teste@exemplo.com.br");
    expect(client.company).toBe("Empresa Teste");
    expect(typeof client.id).toBe("number");

    // e-mail duplicado (caixa diferente) gera conflito
    const dup = await fetch(`${baseUrl}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Outro", email: "TESTE@EXEMPLO.COM.BR" })
    });
    expect(dup.status).toBe(409);
  });

  it("cria um negócio relacionado a um cliente existente", async () => {
    const clientRes = await fetch(`${baseUrl}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Cliente do Negócio", email: "negocio@exemplo.com" })
    });
    const client = await clientRes.json();

    const dealRes = await fetch(`${baseUrl}/api/deals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Negócio de teste",
        valueInCents: 45000,
        clientId: client.id,
        stage: "new"
      })
    });
    expect(dealRes.status).toBe(201);
    const deal = await dealRes.json();
    expect(deal.clientId).toBe(client.id);
    expect(deal.valueInCents).toBe(45000);
    expect(deal.stage).toBe("new");

    // cliente inexistente é rejeitado com 400
    const invalid = await fetch(`${baseUrl}/api/deals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Inválido",
        valueInCents: 100,
        clientId: 99999,
        stage: "new"
      })
    });
    expect(invalid.status).toBe(400);
    const body = await invalid.json();
    expect(typeof body.error).toBe("string");
  });

  it("persiste a mudança de etapa mesmo depois de reiniciar o servidor", async () => {
    const patch = await fetch(`${baseUrl}/api/deals/1`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "proposal" })
    });
    expect(patch.status).toBe(200);
    const updated = await patch.json();
    expect(updated.stage).toBe("proposal");

    // Encerra servidor e conexão, reabre o mesmo arquivo SQLite e confere.
    await stopServer(server);
    db.close();

    db = openDatabase(dbPath);
    const started = await startServer(db);
    server = started.server;
    baseUrl = started.url;

    const res = await fetch(`${baseUrl}/api/deals?clientId=1&stage=proposal`);
    expect(res.status).toBe(200);
    const list = await res.json();
    const deal = list.data.find((d: { id: number }) => d.id === 1);
    expect(deal).toBeDefined();
    expect(deal.stage).toBe("proposal");
  });

  it("pagina e busca clientes com metadados corretos", async () => {
    const res = await fetch(`${baseUrl}/api/clients?page=1&pageSize=4`);
    const body = await res.json();
    expect(body.data.length).toBe(4);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.pageSize).toBe(4);
    expect(body.pagination.total).toBeGreaterThanOrEqual(5);

    const search = await fetch(`${baseUrl}/api/clients?search=marina`);
    const found = await search.json();
    expect(found.data.some((c: { email: string }) => c.email === "marina@example.com")).toBe(
      true
    );
  });
});

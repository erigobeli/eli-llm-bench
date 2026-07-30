import fs from "node:fs";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/server/app";
import { migrate, openDatabase, dropDatabaseFiles } from "../src/server/db";
import { readSeedFile, seedDatabase } from "../src/server/seed";
import type { Db } from "../src/server/db";

const DB_PATH = path.resolve(process.cwd(), ".data", "test-suite.sqlite");

let db: Db;
let server: Server;
let baseUrl: string;

function boot(): { db: Db; server: Server; baseUrl: string } {
  const database = openDatabase(DB_PATH);
  migrate(database);
  const app = createApp(database, { webRoot: null });
  const listener = app.listen(0);
  const address = listener.address() as AddressInfo;
  return {
    db: database,
    server: listener,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

async function stop(listener: Server, database: Db): Promise<void> {
  await new Promise<void>((resolve) => listener.close(() => resolve()));
  database.close();
}

async function json<T>(
  url: string,
  init?: RequestInit,
): Promise<{ status: number; body: T }> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  return {
    status: response.status,
    body: (text.length > 0 ? JSON.parse(text) : null) as T,
  };
}

beforeAll(() => {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  dropDatabaseFiles(DB_PATH);
  const booted = boot();
  db = booted.db;
  server = booted.server;
  baseUrl = booted.baseUrl;
  seedDatabase(db, readSeedFile());
});

afterAll(async () => {
  await stop(server, db);
  dropDatabaseFiles(DB_PATH);
});

describe("API do CRMBench Modelo", () => {
  it("responde ao health check com status ok", async () => {
    const result = await json<{ status: string }>(`${baseUrl}/api/health`);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ status: "ok" });
  });

  it("carrega o seed e calcula os indicadores esperados", async () => {
    const result = await json<{
      totalClients: number;
      openDeals: number;
      pipelineValueInCents: number;
    }>(`${baseUrl}/api/dashboard`);
    expect(result.status).toBe(200);
    expect(result.body.totalClients).toBe(5);
    expect(result.body.openDeals).toBe(6);
    expect(result.body.pipelineValueInCents).toBe(1010000);
  });

  it("cria um cliente válido e recusa e-mail duplicado", async () => {
    const created = await json<{ id: number; name: string; email: string; company: string | null }>(
      `${baseUrl}/api/clients`,
      {
        method: "POST",
        body: JSON.stringify({
          name: "  Empresa Teste  ",
          email: "  Contato@Teste.com.br ",
          company: "  Teste LTDA  ",
        }),
      },
    );

    expect(created.status).toBe(201);
    expect(created.body.name).toBe("Empresa Teste");
    expect(created.body.email).toBe("Contato@Teste.com.br");
    expect(created.body.company).toBe("Teste LTDA");

    const duplicated = await json<{ error: string }>(`${baseUrl}/api/clients`, {
      method: "POST",
      body: JSON.stringify({ name: "Outro nome", email: "contato@teste.com.br" }),
    });
    expect(duplicated.status).toBe(409);
    expect(typeof duplicated.body.error).toBe("string");

    const invalid = await json<{ error: string }>(`${baseUrl}/api/clients`, {
      method: "POST",
      body: JSON.stringify({ name: "A", email: "sem-arroba" }),
    });
    expect(invalid.status).toBe(400);
  });

  it("cria um negócio relacionado a um cliente existente", async () => {
    const client = await json<{ id: number }>(`${baseUrl}/api/clients`, {
      method: "POST",
      body: JSON.stringify({ name: "Cliente do Negócio", email: "negocio@teste.com" }),
    });
    expect(client.status).toBe(201);

    const deal = await json<{
      id: number;
      title: string;
      valueInCents: number;
      clientId: number;
      stage: string;
    }>(`${baseUrl}/api/deals`, {
      method: "POST",
      body: JSON.stringify({
        title: "Implantação do CRM",
        valueInCents: 250000,
        clientId: client.body.id,
        stage: "contact",
      }),
    });

    expect(deal.status).toBe(201);
    expect(deal.body.clientId).toBe(client.body.id);
    expect(deal.body.valueInCents).toBe(250000);
    expect(deal.body.stage).toBe("contact");

    const listed = await json<{ data: Array<{ id: number }>; pagination: { total: number } }>(
      `${baseUrl}/api/deals?clientId=${client.body.id}&stage=contact`,
    );
    expect(listed.status).toBe(200);
    expect(listed.body.pagination.total).toBe(1);
    expect(listed.body.data[0].id).toBe(deal.body.id);

    const invalidClient = await json<{ error: string }>(`${baseUrl}/api/deals`, {
      method: "POST",
      body: JSON.stringify({ title: "Sem cliente", valueInCents: 100, clientId: 99999 }),
    });
    expect(invalidClient.status).toBe(400);
  });

  it("persiste a mudança de etapa mesmo depois de reiniciar o servidor", async () => {
    const created = await json<{ id: number; stage: string; updatedAt: string }>(
      `${baseUrl}/api/deals`,
      {
        method: "POST",
        body: JSON.stringify({
          title: "Negócio para mover",
          valueInCents: 400000,
          clientId: 1,
          stage: "new",
        }),
      },
    );
    expect(created.status).toBe(201);

    const patched = await json<{ stage: string; updatedAt: string }>(
      `${baseUrl}/api/deals/${created.body.id}`,
      { method: "PATCH", body: JSON.stringify({ stage: "proposal" }) },
    );
    expect(patched.status).toBe(200);
    expect(patched.body.stage).toBe("proposal");
    expect(patched.body.updatedAt).not.toBe(created.body.updatedAt);

    // Encerra o servidor e o banco, reabre a partir do arquivo SQLite.
    await stop(server, db);
    const booted = boot();
    db = booted.db;
    server = booted.server;
    baseUrl = booted.baseUrl;

    const reloaded = await json<{ stage: string }>(
      `${baseUrl}/api/deals/${created.body.id}`,
    );
    expect(reloaded.status).toBe(200);
    expect(reloaded.body.stage).toBe("proposal");
  });

  it("aplica busca e paginação nas listagens", async () => {
    const page = await json<{
      data: Array<{ name: string }>;
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    }>(`${baseUrl}/api/clients?page=1&pageSize=4`);

    expect(page.status).toBe(200);
    expect(page.body.data).toHaveLength(4);
    expect(page.body.pagination.pageSize).toBe(4);
    expect(page.body.pagination.totalPages).toBe(
      Math.ceil(page.body.pagination.total / 4),
    );

    const search = await json<{ data: Array<{ name: string }>; pagination: { total: number } }>(
      `${baseUrl}/api/clients?search=MARINA`,
    );
    expect(search.status).toBe(200);
    expect(search.body.pagination.total).toBe(1);
    expect(search.body.data[0].name).toBe("Marina Costa");
  });
});

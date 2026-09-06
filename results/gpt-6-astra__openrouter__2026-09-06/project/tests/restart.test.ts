import { expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

it("mantem cliente, negocio e etapa apos encerrar e reiniciar o servidor", async () => {
  mkdirSync(resolve(".data"), { recursive: true });
  const dir = mkdtempSync(resolve(".data/restart-"));
  let child: ChildProcess | undefined;

  async function start() {
    child = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
      env: { ...process.env, PORT: "0", DB_PATH: join(dir, "crm.sqlite") },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Servidor nao iniciou no prazo.")),
        8000,
      );
      child!.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child!.once("exit", (code) => {
        clearTimeout(timeout);
        reject(new Error(`Servidor encerrou com codigo ${code}.`));
      });
      child!.stdout!.on("data", (chunk) => {
        const match = chunk.toString().match(/http:\/\/localhost:(\d+)/);
        if (match) {
          clearTimeout(timeout);
          resolve(`http://127.0.0.1:${match[1]}`);
        }
      });
    });
  }

  async function stop() {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    const closed = once(child, "exit");
    child.kill("SIGTERM");
    await closed;
    child = undefined;
  }

  try {
    let origin = await start();
    const clientResponse = await fetch(`${origin}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Cliente persistente",
        email: "persistente@example.com",
      }),
    });
    expect(clientResponse.status).toBe(201);
    const client = await clientResponse.json();
    const dealResponse = await fetch(`${origin}/api/deals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Contrato persistente",
        valueInCents: 25000,
        clientId: client.id,
        stage: "new",
      }),
    });
    expect(dealResponse.status).toBe(201);
    const deal = await dealResponse.json();
    const update = await fetch(`${origin}/api/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "proposal" }),
    });
    expect(update.status).toBe(200);
    await stop();
    origin = await start();
    const persisted = await (await fetch(`${origin}/api/deals`)).json();
    expect(persisted.data).toHaveLength(1);
    expect(persisted.data[0]).toMatchObject({
      id: deal.id,
      clientId: client.id,
      stage: "proposal",
      valueInCents: 25000,
    });
    expect(await (await fetch(`${origin}/api/dashboard`)).json()).toEqual({
      totalClients: 1,
      openDeals: 1,
      pipelineValueInCents: 25000,
    });
  } finally {
    await stop();
    rmSync(dir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  }
}, 20000);

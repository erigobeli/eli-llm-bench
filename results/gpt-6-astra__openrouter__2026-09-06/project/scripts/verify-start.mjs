import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const windows = process.platform === "win32";
const port = process.env.PORT || "3000";
const origin = `http://127.0.0.1:${port}`;
const server = windows
  ? spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npm start"], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    })
  : spawn("npm", ["start"], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });
server.stdout.on("data", (chunk) => process.stdout.write(chunk));
server.stderr.on("data", (chunk) => process.stderr.write(chunk));
let stopped = false;
server.on("exit", () => {
  stopped = true;
});

try {
  let healthy = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (stopped) throw new Error("O servidor encerrou antes do health.");
    try {
      const response = await fetch(`${origin}/api/health`, {
        signal: AbortSignal.timeout(1000),
      });
      healthy =
        response.status === 200 &&
        JSON.stringify(await response.json()) === '{"status":"ok"}';
      if (healthy) break;
    } catch {}
    await delay(400);
  }
  if (!healthy) throw new Error("Health nao respondeu dentro do prazo.");
  console.log('GET /api/health: 200 { "status": "ok" }');
  for (const route of ["/", "/clientes", "/negocios", "/pipeline"]) {
    const response = await fetch(`${origin}${route}`);
    const html = await response.text();
    if (
      response.status !== 200 ||
      !html.includes("<title>CRMBench Modelo</title>")
    )
      throw new Error(`Falha na rota ${route}`);
    const script = html.match(/src="([^"]+\.js)"/);
    if (!script || !(await fetch(new URL(script[1], origin))).ok)
      throw new Error("Bundle de producao indisponivel.");
    console.log(`GET ${route}: frontend e bundle disponiveis na mesma origem.`);
  }
  const metrics = await fetch(`${origin}/api/dashboard`);
  if (!metrics.ok) throw new Error("Indicadores indisponiveis.");
  console.log("Indicadores:", JSON.stringify(await metrics.json()));
} finally {
  if (!stopped && server.pid) {
    if (windows)
      spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    else {
      try {
        process.kill(-server.pid, "SIGTERM");
      } catch {}
    }
  }
  for (let attempt = 0; attempt < 30 && !stopped; attempt++) await delay(100);
  console.log("Servidor temporario encerrado.");
}

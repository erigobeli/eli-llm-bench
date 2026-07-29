import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const resultsDirectory = path.join(repositoryRoot, "results");
const readmePath = path.join(repositoryRoot, "README.md");
const startMarker = "<!-- leaderboard:start -->";
const endMarker = "<!-- leaderboard:end -->";

function fail(message) {
  throw new Error(message);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`Não foi possível ler ${filePath}: ${error.message}`);
  }
}

function requireValue(condition, message) {
  if (!condition) fail(message);
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ").trim();
}

function formatDuration(milliseconds) {
  requireValue(
    Number.isInteger(milliseconds) && milliseconds >= 0,
    "timing.buildTotalMs precisa ser um inteiro não negativo."
  );
  const totalSeconds = Math.round(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatCost(amount, currency) {
  requireValue(
    typeof amount === "number" && Number.isFinite(amount) && amount >= 0,
    "cost.participant precisa ser um número não negativo."
  );
  requireValue(currency === "USD", "A moeda pública da v1 precisa ser USD.");
  return `US$ ${amount.toFixed(2)}`;
}

function loadResults() {
  if (!fs.existsSync(resultsDirectory)) return [];
  const directories = fs
    .readdirSync(resultsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .sort((left, right) => left.name.localeCompare(right.name));

  const seenRunIds = new Set();
  const results = [];

  for (const directory of directories) {
    const resultPath = path.join(resultsDirectory, directory.name, "result.json");
    if (!fs.existsSync(resultPath)) {
      fail(`Resultado sem result.json: results/${directory.name}`);
    }
    const result = readJson(resultPath);
    requireValue(result.runId === directory.name, `runId não corresponde à pasta: ${directory.name}`);
    requireValue(!seenRunIds.has(result.runId), `runId duplicado: ${result.runId}`);
    seenRunIds.add(result.runId);

    requireValue(result.model && typeof result.model.id === "string", `Modelo ausente em ${result.runId}`);
    requireValue(typeof result.model.provider === "string", `Provider ausente em ${result.runId}`);
    requireValue(typeof result.model.reasoning === "string", `Reasoning ausente em ${result.runId}`);
    requireValue(result.score?.maximum === 100, `Nota máxima inválida em ${result.runId}`);
    requireValue(
      typeof result.score?.earned === "number" &&
        result.score.earned >= 0 &&
        result.score.earned <= 100,
      `Nota inválida em ${result.runId}`
    );
    requireValue(result.timing, `Tempo ausente em ${result.runId}`);
    requireValue(result.cost, `Custo ausente em ${result.runId}`);
    requireValue(result.links, `Links ausentes em ${result.runId}`);

    if (result.resultStatus === "COMPLETE") results.push(result);
  }

  return results.sort(
    (left, right) =>
      right.score.earned - left.score.earned ||
      left.cost.participant - right.cost.participant ||
      left.timing.buildTotalMs - right.timing.buildTotalMs ||
      left.runId.localeCompare(right.runId)
  );
}

function buildLeaderboard(results) {
  const lines = [
    startMarker,
    "",
    "| # | Modelo | Provider | Raciocínio | Nota | Tempo | Custo | Vídeo |",
    "|---:|---|---|---|---:|---:|---:|---|"
  ];

  if (results.length === 0) {
    lines.push("| — | Nenhuma execução oficial publicada | — | — | — | — | — | — |");
  } else {
    results.forEach((result, index) => {
      const video = result.links.video
        ? `[Assistir](${encodeURI(result.links.video)})`
        : "—";
      const model = `[${escapeCell(result.model.id)}](./results/${encodeURI(result.runId)}/report.md)`;
      lines.push(
        [
          `| ${index + 1}`,
          model,
          escapeCell(result.model.provider),
          escapeCell(result.model.reasoning),
          `${result.score.earned}/100`,
          formatDuration(result.timing.buildTotalMs),
          formatCost(result.cost.participant, result.cost.currency),
          `${video} |`
        ].join(" | ")
      );
    });
  }

  lines.push("", endMarker);
  return lines.join("\n");
}

const readme = fs.readFileSync(readmePath, "utf8");
const start = readme.indexOf(startMarker);
const end = readme.indexOf(endMarker);
requireValue(start >= 0 && end > start, "Marcadores do ranking não foram encontrados no README.");

const results = loadResults();
const leaderboard = buildLeaderboard(results);
const updatedReadme =
  readme.slice(0, start) + leaderboard + readme.slice(end + endMarker.length);
fs.writeFileSync(readmePath, updatedReadme, "utf8");

console.log(`Ranking atualizado com ${results.length} execução(ões) oficial(is).`);

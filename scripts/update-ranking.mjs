import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const resultsDirectory = path.join(repositoryRoot, "results");
const readmePath = path.join(repositoryRoot, "README.md");
const startMarker = "<!-- leaderboard:start -->";
const endMarker = "<!-- leaderboard:end -->";
const ignoredDeliveryDirectories = new Set([
  ".cache",
  ".data",
  ".git",
  ".next",
  ".nyc_output",
  ".parcel-cache",
  ".turbo",
  ".vite",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "playwright-report",
  "test-results"
]);
const codeExtensions = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".mjs",
  ".scss",
  ".sql",
  ".ts",
  ".tsx"
]);

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

function formatInteger(value) {
  requireValue(Number.isInteger(value) && value >= 0, "Valor inteiro inválido no ranking.");
  return new Intl.NumberFormat("pt-BR").format(value);
}

function totalTokens(result) {
  const tokens = result.usage?.tokens;
  requireValue(tokens, `Tokens ausentes em ${result.runId}`);
  const categories = ["input", "output", "reasoning", "cached"];
  return categories.reduce((total, category) => {
    const value = tokens[category];
    requireValue(
      Number.isInteger(value) && value >= 0,
      `usage.tokens.${category} inválido em ${result.runId}`
    );
    return total + value;
  }, 0);
}

function measureDelivery(runId) {
  const projectDirectory = path.join(resultsDirectory, runId, "project");
  requireValue(fs.existsSync(projectDirectory), `Projeto público ausente em ${runId}`);

  let files = 0;
  let nonEmptyCodeLines = 0;

  function visit(directory) {
    const entries = fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!ignoredDeliveryDirectories.has(entry.name.toLowerCase())) visit(entryPath);
        continue;
      }
      if (!entry.isFile()) continue;

      files += 1;
      if (!codeExtensions.has(path.extname(entry.name).toLowerCase())) continue;

      const contents = fs.readFileSync(entryPath, "utf8");
      nonEmptyCodeLines += contents
        .split(/\r\n?|\n/)
        .filter((line) => line.trim().length > 0).length;
    }
  }

  visit(projectDirectory);
  return { files, nonEmptyCodeLines };
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
    "| # | Modelo | Provider | Raciocínio | Nota | Tempo ativo | Custo | Tokens processados | Arquivos | Linhas (LOC) |",
    "|---:|---|---|---|---:|---:|---:|---:|---:|---:|"
  ];

  if (results.length === 0) {
    lines.push("| — | Nenhuma execução oficial publicada | — | — | — | — | — | — | — | — |");
  } else {
    results.forEach((result, index) => {
      const model = `[${escapeCell(result.model.id)}](./results/${encodeURI(result.runId)}/report.md)`;
      const delivery = measureDelivery(result.runId);
      lines.push(
        [
          `| ${index + 1}`,
          model,
          escapeCell(result.model.provider),
          escapeCell(result.model.reasoning),
          `${result.score.earned}/100`,
          formatDuration(result.timing.buildTotalMs),
          formatCost(result.cost.participant, result.cost.currency),
          formatInteger(totalTokens(result)),
          formatInteger(delivery.files),
          `${formatInteger(delivery.nonEmptyCodeLines)} |`
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

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

let instance: Database.Database | null = null;

export function getDbPath(): string {
  const configured = process.env.DB_PATH && process.env.DB_PATH.trim().length > 0
    ? process.env.DB_PATH
    : "./.data/eli-llm-bench.sqlite";
  return path.resolve(process.cwd(), configured);
}

export function getDb(): Database.Database {
  if (instance) {
    return instance;
  }

  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  instance = new Database(dbPath);
  instance.pragma("journal_mode = WAL");
  instance.pragma("foreign_keys = ON");
  return instance;
}

export function closeDb(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}

import fs from 'node:fs';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), '.data', 'test-eli-llm-bench.sqlite');

process.env.DB_PATH = dbPath;

for (const suffix of ['', '-wal', '-shm']) {
  fs.rmSync(dbPath + suffix, { force: true });
}

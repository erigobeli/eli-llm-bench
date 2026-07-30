import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { createApp } from '../src/server/app';
import { openDatabase, removeDatabaseFiles, type AppDatabase } from '../src/server/db';
import { seedDatabase } from '../src/server/seed';

export interface TestServer {
  url: string;
  db: AppDatabase;
  server: Server;
  close: () => Promise<void>;
}

export function testDbPath(name: string): string {
  return path.resolve(process.cwd(), '.data', `test-${name}.sqlite`);
}

/** Sobe uma instância isolada da API sobre um banco próprio. */
export async function startTestServer(
  dbPath: string,
  options: { seed?: boolean; fresh?: boolean } = {},
): Promise<TestServer> {
  const { seed = false, fresh = true } = options;
  if (fresh) removeDatabaseFiles(dbPath);

  const db = openDatabase(dbPath);
  if (seed) seedDatabase(db);

  const app = createApp(db);
  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    db,
    server,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => {
          db.close();
          resolve();
        });
      }),
  };
}

export interface ApiResponse<T> {
  status: number;
  body: T;
}

export async function api<T = unknown>(
  base: string,
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  return {
    status: response.status,
    body: (text ? JSON.parse(text) : null) as T,
  };
}

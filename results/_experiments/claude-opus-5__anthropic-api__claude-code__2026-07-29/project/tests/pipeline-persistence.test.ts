import { afterAll, expect, it } from 'vitest';
import { removeDatabaseFiles } from '../src/server/db';
import type { Deal } from '../src/server/types';
import { api, startTestServer, testDbPath } from './helpers';

const DB_PATH = testDbPath('pipeline');

afterAll(() => {
  removeDatabaseFiles(DB_PATH);
});

it('mudança de etapa persiste no SQLite após reiniciar o servidor', async () => {
  const first = await startTestServer(DB_PATH, { seed: true });

  const before = await api<Deal>(first.url, '/api/deals/1');
  expect(before.status).toBe(200);
  expect(before.body.stage).toBe('new');

  const moved = await api<Deal>(first.url, '/api/deals/1', {
    method: 'PATCH',
    body: JSON.stringify({ stage: 'proposal' }),
  });
  expect(moved.status).toBe(200);
  expect(moved.body.stage).toBe('proposal');
  expect(moved.body.updatedAt).not.toBe(before.body.updatedAt);

  await first.close();

  // Reabre o mesmo arquivo de banco, simulando reinício do processo.
  const second = await startTestServer(DB_PATH, { seed: false, fresh: false });
  try {
    const after = await api<Deal>(second.url, '/api/deals/1');
    expect(after.status).toBe(200);
    expect(after.body.stage).toBe('proposal');
    expect(after.body.title).toBe(before.body.title);

    const dashboard = await api<{ openDeals: number; pipelineValueInCents: number }>(
      second.url,
      '/api/dashboard',
    );
    expect(dashboard.body.openDeals).toBe(6);
    expect(dashboard.body.pipelineValueInCents).toBe(1010000);
  } finally {
    await second.close();
  }
});

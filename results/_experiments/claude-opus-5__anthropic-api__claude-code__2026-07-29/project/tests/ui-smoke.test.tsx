// @vitest-environment jsdom
import { StrictMode, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from '../src/client/App';

const CLIENTS = [
  {
    id: 1,
    name: 'Nébula Tecnologia',
    email: 'contato@nebula.com.br',
    company: 'Nébula Tecnologia LTDA',
    createdAt: '2026-07-20T12:00:00.000Z',
    updatedAt: '2026-07-20T12:00:00.000Z',
  },
];

const DEALS = [
  {
    id: 1,
    title: 'Site institucional',
    valueInCents: 120000,
    clientId: 1,
    stage: 'new',
    createdAt: '2026-07-21T12:00:00.000Z',
    updatedAt: '2026-07-21T12:00:00.000Z',
  },
  {
    id: 2,
    title: 'Portal do cliente',
    valueInCents: 500000,
    clientId: 1,
    stage: 'won',
    createdAt: '2026-07-15T12:00:00.000Z',
    updatedAt: '2026-07-15T12:00:00.000Z',
  },
];

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(payload),
  } as unknown as Response;
}

let container: HTMLDivElement;
let root: Root | null = null;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => {
      const url = String(input);
      if (url.startsWith('/api/dashboard')) {
        return jsonResponse({ totalClients: 1, openDeals: 1, pipelineValueInCents: 120000 });
      }
      if (url.startsWith('/api/clients')) {
        return jsonResponse({
          data: CLIENTS,
          pagination: { page: 1, pageSize: 4, total: 1, totalPages: 1 },
        });
      }
      if (url.startsWith('/api/deals')) {
        return jsonResponse({
          data: DEALS,
          pagination: { page: 1, pageSize: 4, total: 2, totalPages: 1 },
        });
      }
      throw new Error(`Rota não mapeada no teste: ${url}`);
    }),
  );
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  unmount();
  container.remove();
  vi.unstubAllGlobals();
});

function unmount(): void {
  const current = root;
  if (!current) return;
  root = null;
  act(() => current.unmount());
}

async function renderAt(path: string): Promise<void> {
  unmount();
  const current = createRoot(container);
  root = current;
  await act(async () => {
    current.render(
      <StrictMode>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </StrictMode>,
    );
  });
  await act(async () => {
    await Promise.resolve();
  });
}

it('renderiza a marca, os indicadores e o pipeline sem erros', async () => {
  await renderAt('/');
  expect(container.textContent).toContain('CRMBench Modelo');
  expect(container.querySelectorAll('[data-testid="metric"]')).toHaveLength(3);
  expect(container.textContent).toContain('R$');

  await renderAt('/pipeline');
  const columns = container.querySelectorAll('[data-testid="pipeline-column"]');
  expect(Array.from(columns).map((column) => column.getAttribute('data-stage'))).toEqual([
    'new',
    'contact',
    'proposal',
    'won',
  ]);
  expect(container.querySelectorAll('[data-testid="deal-card"]')).toHaveLength(2);
});

it('renderiza as listagens de clientes e negócios com paginação', async () => {
  await renderAt('/clientes');
  expect(container.querySelectorAll('[data-testid="client-row"]').length).toBeGreaterThan(0);
  const labels = Array.from(container.querySelectorAll('[data-testid="pagination"] button')).map(
    (button) => button.getAttribute('aria-label'),
  );
  expect(labels).toEqual(['Anterior', 'Próxima']);

  await renderAt('/negocios');
  expect(container.querySelectorAll('[data-testid="deal-row"]').length).toBeGreaterThan(0);
  expect(container.textContent).toContain('Negócios');
});

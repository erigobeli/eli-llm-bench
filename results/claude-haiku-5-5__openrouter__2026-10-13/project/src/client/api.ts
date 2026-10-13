import { useCallback, useEffect, useState } from 'react';
import type { Client, Dashboard, Deal, Paginated, Stage } from '../shared/types.js';

export const STAGE_LABELS: Record<Stage, string> = {
  new: 'Novo',
  contact: 'Em contato',
  proposal: 'Proposta',
  won: 'Fechado',
};

export const STAGE_ORDER: Stage[] = ['new', 'contact', 'proposal', 'won'];

export class ApiError extends Error {}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique se a aplicação está em execução.');
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message = (body as { error?: string } | null)?.error;
    throw new ApiError(message ?? `Erro inesperado (código ${response.status}).`);
  }
  return body as T;
}

const json = (value: unknown) => JSON.stringify(value);

export const api = {
  dashboard: () => request<Dashboard>('/api/dashboard'),

  listClients: (params: URLSearchParams) => request<Paginated<Client>>(`/api/clients?${params}`),
  createClient: (data: unknown) => request<Client>('/api/clients', { method: 'POST', body: json(data) }),
  updateClient: (id: number, data: unknown) =>
    request<Client>(`/api/clients/${id}`, { method: 'PATCH', body: json(data) }),
  deleteClient: (id: number) => request<void>(`/api/clients/${id}`, { method: 'DELETE' }),

  listDeals: (params: URLSearchParams) => request<Paginated<Deal>>(`/api/deals?${params}`),
  createDeal: (data: unknown) => request<Deal>('/api/deals', { method: 'POST', body: json(data) }),
  updateDeal: (id: number, data: unknown) => request<Deal>(`/api/deals/${id}`, { method: 'PATCH', body: json(data) }),
  deleteDeal: (id: number) => request<void>(`/api/deals/${id}`, { method: 'DELETE' }),
};

/** Percorre todas as páginas de uma listagem paginada. */
export async function fetchAll<T>(
  load: (params: URLSearchParams) => Promise<Paginated<T>>,
  extra: Record<string, string> = {},
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  for (;;) {
    const result = await load(new URLSearchParams({ ...extra, page: String(page), pageSize: '50' }));
    items.push(...result.data);
    if (page >= result.pagination.totalPages || result.data.length === 0) return items;
    page += 1;
  }
}

export interface Resource<T> {
  status: 'loading' | 'ready' | 'error';
  data: T | undefined;
  error: string | undefined;
  reload: () => void;
}

/** Carrega dados assíncronos mantendo estados de carregamento, erro e sucesso. */
export function useResource<T>(load: () => Promise<T>, deps: unknown[]): Resource<T> {
  const [state, setState] = useState<{ status: Resource<T>['status']; data?: T; error?: string }>({
    status: 'loading',
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setState((prev) => ({ status: 'loading', data: prev.data }));
    load().then(
      (data) => active && setState({ status: 'ready', data }),
      (err: unknown) =>
        active && setState({ status: 'error', error: err instanceof Error ? err.message : 'Erro desconhecido.' }),
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { status: state.status, data: state.data, error: state.error, reload };
}

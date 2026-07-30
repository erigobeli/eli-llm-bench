import type { Client, DashboardMetrics, Deal, Paginated, Stage } from './types';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      ...init,
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão.');
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload = text ? safeJson(text) : null;

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : 'Ocorreu um erro inesperado na requisição.';
    throw new Error(message);
  }

  return payload as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/* --------------------------------------------------------------- clientes */

export interface ClientListParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export const listClients = (params: ClientListParams = {}) =>
  request<Paginated<Client>>(`/clients${toQuery({ ...params })}`);

export interface ClientPayload {
  name: string;
  email: string;
  company: string | null;
}

export const createClient = (payload: ClientPayload) =>
  request<Client>('/clients', { method: 'POST', body: JSON.stringify(payload) });

export const updateClient = (id: number, payload: Partial<ClientPayload>) =>
  request<Client>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });

export const deleteClient = (id: number) =>
  request<void>(`/clients/${id}`, { method: 'DELETE' });

/* --------------------------------------------------------------- negócios */

export interface DealListParams {
  search?: string;
  stage?: Stage | '';
  clientId?: number | '';
  page?: number;
  pageSize?: number;
}

export const listDeals = (params: DealListParams = {}) =>
  request<Paginated<Deal>>(
    `/deals${toQuery({
      search: params.search,
      stage: params.stage || undefined,
      clientId: params.clientId === '' ? undefined : params.clientId,
      page: params.page,
      pageSize: params.pageSize,
    })}`,
  );

export interface DealPayload {
  title: string;
  valueInCents: number;
  clientId: number;
  stage: Stage;
}

export const createDeal = (payload: DealPayload) =>
  request<Deal>('/deals', { method: 'POST', body: JSON.stringify(payload) });

export const updateDeal = (id: number, payload: Partial<DealPayload>) =>
  request<Deal>(`/deals/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });

export const deleteDeal = (id: number) => request<void>(`/deals/${id}`, { method: 'DELETE' });

/* ------------------------------------------------------------ indicadores */

export const getDashboard = () => request<DashboardMetrics>('/dashboard');

/** Busca todos os negócios paginando internamente (usado pelo pipeline). */
export async function listAllDeals(): Promise<Deal[]> {
  const all: Deal[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = await listDeals({ page, pageSize: 50 });
    all.push(...result.data);
    totalPages = result.pagination.totalPages;
    page += 1;
  } while (page <= totalPages && page < 100);
  return all;
}

/** Busca todos os clientes (para seletores e rótulos). */
export async function listAllClients(): Promise<Client[]> {
  const all: Client[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = await listClients({ page, pageSize: 50 });
    all.push(...result.data);
    totalPages = result.pagination.totalPages;
    page += 1;
  } while (page <= totalPages && page < 100);
  return all;
}

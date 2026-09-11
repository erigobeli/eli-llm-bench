import type {
  Client,
  DashboardMetrics,
  Deal,
  ListResponse,
  Stage,
} from './types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type QueryValue = string | number | undefined | null;

function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value) !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : 'Não foi possível concluir a operação.';
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export interface ClientInput {
  name: string;
  email: string;
  company: string | null;
}

export interface DealInput {
  title: string;
  valueInCents: number;
  clientId: number;
  stage: Stage;
}

export interface ListParams {
  search?: string;
  page?: number;
  pageSize?: number;
  stage?: string;
  clientId?: number | string;
}

export const api = {
  dashboard: () => request<DashboardMetrics>('/api/dashboard'),

  clients: {
    list: (params: ListParams = {}) =>
      request<ListResponse<Client>>(`/api/clients${buildQuery(params)}`),
    create: (body: ClientInput) =>
      request<Client>('/api/clients', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Partial<ClientInput>) =>
      request<Client>(`/api/clients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<void>(`/api/clients/${id}`, { method: 'DELETE' }),
  },

  deals: {
    list: (params: ListParams = {}) =>
      request<ListResponse<Deal>>(`/api/deals${buildQuery(params)}`),
    create: (body: DealInput) =>
      request<Deal>('/api/deals', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Partial<DealInput>) =>
      request<Deal>(`/api/deals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      request<void>(`/api/deals/${id}`, { method: 'DELETE' }),
  },
};

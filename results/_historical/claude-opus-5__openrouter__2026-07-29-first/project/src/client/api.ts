export type Stage = 'new' | 'contact' | 'proposal' | 'won';

export const STAGES: Stage[] = ['new', 'contact', 'proposal', 'won'];

export const STAGE_LABELS: Record<Stage, string> = {
  new: 'Novo',
  contact: 'Em contato',
  proposal: 'Proposta',
  won: 'Fechado',
};

export interface Client {
  id: number;
  name: string;
  email: string;
  company: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: number;
  title: string;
  valueInCents: number;
  clientId: number;
  stage: Stage;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

export interface DashboardMetrics {
  totalClients: number;
  openDeals: number;
  pipelineValueInCents: number;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão.');
  }

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
      payload && typeof payload === 'object' && typeof (payload as any).error === 'string'
        ? (payload as any).error
        : `Falha na requisição (HTTP ${response.status}).`;
    throw new Error(message);
  }

  return payload as T;
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export interface ClientPayload {
  name: string;
  email: string;
  company: string | null;
}

export interface DealPayload {
  title: string;
  valueInCents: number;
  clientId: number;
  stage: Stage;
}

export const api = {
  health: () => requestJson<{ status: string }>('/api/health'),

  dashboard: () => requestJson<DashboardMetrics>('/api/dashboard'),

  listClients: (params: { search?: string; page?: number; pageSize?: number }) =>
    requestJson<Paginated<Client>>(`/api/clients${query(params)}`),

  createClient: (payload: ClientPayload) =>
    requestJson<Client>('/api/clients', { method: 'POST', body: JSON.stringify(payload) }),

  updateClient: (id: number, payload: Partial<ClientPayload>) =>
    requestJson<Client>(`/api/clients/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  deleteClient: (id: number) => requestJson<void>(`/api/clients/${id}`, { method: 'DELETE' }),

  clientDeals: (id: number) => requestJson<{ data: Deal[] }>(`/api/clients/${id}/deals`),

  listDeals: (params: {
    search?: string;
    stage?: string;
    clientId?: number | string;
    page?: number;
    pageSize?: number;
  }) => requestJson<Paginated<Deal>>(`/api/deals${query(params)}`),

  createDeal: (payload: DealPayload) =>
    requestJson<Deal>('/api/deals', { method: 'POST', body: JSON.stringify(payload) }),

  updateDeal: (id: number, payload: Partial<DealPayload>) =>
    requestJson<Deal>(`/api/deals/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  deleteDeal: (id: number) => requestJson<void>(`/api/deals/${id}`, { method: 'DELETE' }),
};

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatCurrency(valueInCents: number): string {
  return currency.format((Number(valueInCents) || 0) / 100);
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function centsFromInput(raw: string): number | null {
  const text = raw.trim().replace(/\s/g, '');
  if (text === '') {
    return null;
  }
  const normalized = text.includes(',')
    ? text.replace(/\./g, '').replace(',', '.')
    : text;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Math.round(parsed * 100);
}

export function inputFromCents(valueInCents: number): string {
  return (Number(valueInCents) / 100).toFixed(2);
}

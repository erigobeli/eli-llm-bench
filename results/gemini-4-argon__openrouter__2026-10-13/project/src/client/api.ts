import type {
  Client,
  DashboardMetrics,
  Deal,
  DealStage,
  PaginatedResponse,
} from './types';

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const errorMsg =
      payload && typeof payload === 'object' && 'error' in payload && typeof (payload as { error: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : 'Ocorreu um erro ao processar a solicitação.';
    throw new Error(errorMsg);
  }

  return payload as T;
}

export function fetchDashboard(): Promise<DashboardMetrics> {
  return requestJson<DashboardMetrics>('/api/dashboard');
}

export function fetchClients(params: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<PaginatedResponse<Client>> {
  const sp = new URLSearchParams();
  sp.set('page', String(params.page ?? 1));
  sp.set('pageSize', String(params.pageSize ?? 4));
  if (params.search && params.search.trim()) {
    sp.set('search', params.search.trim());
  }
  return requestJson<PaginatedResponse<Client>>(`/api/clients?${sp.toString()}`);
}

export async function fetchAllClients(): Promise<Client[]> {
  const first = await fetchClients({ page: 1, pageSize: 50 });
  const all = [...first.data];
  for (let p = 2; p <= first.pagination.totalPages; p++) {
    const next = await fetchClients({ page: p, pageSize: 50 });
    all.push(...next.data);
  }
  return all;
}

export function createClient(data: {
  name: string;
  email: string;
  company?: string | null;
}): Promise<Client> {
  return requestJson<Client>('/api/clients', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateClient(
  id: number,
  data: { name?: string; email?: string; company?: string | null }
): Promise<Client> {
  return requestJson<Client>(`/api/clients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteClient(id: number): Promise<void> {
  return requestJson<void>(`/api/clients/${id}`, {
    method: 'DELETE',
  });
}

export function fetchDeals(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  stage?: string;
  clientId?: string | number;
}): Promise<PaginatedResponse<Deal>> {
  const sp = new URLSearchParams();
  sp.set('page', String(params.page ?? 1));
  sp.set('pageSize', String(params.pageSize ?? 4));
  if (params.search && params.search.trim()) {
    sp.set('search', params.search.trim());
  }
  if (params.stage && params.stage.trim()) {
    sp.set('stage', params.stage.trim());
  }
  if (params.clientId !== undefined && String(params.clientId).trim() !== '') {
    sp.set('clientId', String(params.clientId).trim());
  }
  return requestJson<PaginatedResponse<Deal>>(`/api/deals?${sp.toString()}`);
}

export async function fetchAllDeals(): Promise<Deal[]> {
  const first = await fetchDeals({ page: 1, pageSize: 50 });
  const all = [...first.data];
  for (let p = 2; p <= first.pagination.totalPages; p++) {
    const next = await fetchDeals({ page: p, pageSize: 50 });
    all.push(...next.data);
  }
  return all;
}

export function createDeal(data: {
  title: string;
  valueInCents: number;
  clientId: number;
  stage: DealStage;
}): Promise<Deal> {
  return requestJson<Deal>('/api/deals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateDeal(
  id: number,
  data: {
    title?: string;
    valueInCents?: number;
    clientId?: number;
    stage?: DealStage;
  }
): Promise<Deal> {
  return requestJson<Deal>(`/api/deals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteDeal(id: number): Promise<void> {
  return requestJson<void>(`/api/deals/${id}`, {
    method: 'DELETE',
  });
}

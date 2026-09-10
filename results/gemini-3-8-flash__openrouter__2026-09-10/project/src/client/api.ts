import {
  Client,
  Deal,
  DashboardMetrics,
  PaginatedResponse,
  CreateClientInput,
  UpdateClientInput,
  CreateDealInput,
  UpdateDealInput,
} from '../shared/types.js';

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return {} as T;
  }

  const contentType = res.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const body = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const errorMsg = (isJson && body?.error) ? body.error : `Erro HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  return body as T;
}

export async function getDashboard(): Promise<DashboardMetrics> {
  const res = await fetch('/api/dashboard');
  return handleResponse<DashboardMetrics>(res);
}

export async function getClients(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<Client>> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', params.page.toString());
  if (params.pageSize) query.set('pageSize', params.pageSize.toString());

  const res = await fetch(`/api/clients?${query.toString()}`);
  return handleResponse<PaginatedResponse<Client>>(res);
}

export async function createClient(data: CreateClientInput): Promise<Client> {
  const res = await fetch('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Client>(res);
}

export async function updateClient(id: number, data: UpdateClientInput): Promise<Client> {
  const res = await fetch(`/api/clients/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Client>(res);
}

export async function deleteClient(id: number): Promise<void> {
  const res = await fetch(`/api/clients/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<void>(res);
}

export async function getDeals(params: {
  search?: string;
  stage?: string;
  clientId?: number;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<Deal>> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.stage) query.set('stage', params.stage);
  if (params.clientId) query.set('clientId', params.clientId.toString());
  if (params.page) query.set('page', params.page.toString());
  if (params.pageSize) query.set('pageSize', params.pageSize.toString());

  const res = await fetch(`/api/deals?${query.toString()}`);
  return handleResponse<PaginatedResponse<Deal>>(res);
}

export async function createDeal(data: CreateDealInput): Promise<Deal> {
  const res = await fetch('/api/deals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Deal>(res);
}

export async function updateDeal(id: number, data: UpdateDealInput): Promise<Deal> {
  const res = await fetch(`/api/deals/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Deal>(res);
}

export async function deleteDeal(id: number): Promise<void> {
  const res = await fetch(`/api/deals/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<void>(res);
}

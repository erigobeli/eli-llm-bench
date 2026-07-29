import type {
  Client,
  Deal,
  DealStage,
  DashboardMetrics,
  ListResult
} from "../types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {})
    }
  });

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof body?.error === "string" ? body.error : "Erro inesperado.";
    throw new ApiError(message, response.status);
  }

  return body as T;
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query.length > 0 ? `?${query}` : "";
}

export function fetchDashboard(): Promise<DashboardMetrics> {
  return request<DashboardMetrics>("/api/dashboard");
}

export function fetchClients(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<ListResult<Client>> {
  return request<ListResult<Client>>(`/api/clients${toQuery(params)}`);
}

export function createClient(input: { name: string; email: string; company?: string | null }): Promise<Client> {
  return request<Client>("/api/clients", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateClient(
  id: number,
  input: Partial<{ name: string; email: string; company: string | null }>
): Promise<Client> {
  return request<Client>(`/api/clients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function deleteClient(id: number): Promise<void> {
  return request<void>(`/api/clients/${id}`, { method: "DELETE" });
}

export function fetchDeals(params: {
  search?: string;
  stage?: DealStage | "";
  clientId?: number;
  page?: number;
  pageSize?: number;
}): Promise<ListResult<Deal>> {
  return request<ListResult<Deal>>(`/api/deals${toQuery(params)}`);
}

export function createDeal(input: {
  title: string;
  valueInCents: number;
  clientId: number;
  stage: DealStage;
}): Promise<Deal> {
  return request<Deal>("/api/deals", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function updateDeal(
  id: number,
  input: Partial<{ title: string; valueInCents: number; clientId: number; stage: DealStage }>
): Promise<Deal> {
  return request<Deal>(`/api/deals/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function deleteDeal(id: number): Promise<void> {
  return request<void>(`/api/deals/${id}`, { method: "DELETE" });
}

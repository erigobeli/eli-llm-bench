import type { Client, DashboardMetrics, Deal, Paginated, Stage } from "../../shared/types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, "Não foi possível conectar ao servidor.");
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const message =
      body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : `Erro ${res.status} ao comunicar com o servidor.`;
    throw new ApiError(res.status, message);
  }
  return body as T;
}

function qs(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") search.set(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

export interface ClientListParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface DealListParams extends ClientListParams {
  stage?: Stage | "";
  clientId?: number | "";
}

export type ClientInput = { name: string; email: string; company: string | null };
export type DealInput = { title: string; valueInCents: number; clientId: number; stage: Stage };

export const api = {
  health: () => http<{ status: string }>("/api/health"),
  dashboard: () => http<DashboardMetrics>("/api/dashboard"),

  listClients: (params: ClientListParams = {}) =>
    http<Paginated<Client>>(`/api/clients${qs({ ...params })}`),
  createClient: (input: ClientInput) => http<Client>("/api/clients", { method: "POST", body: JSON.stringify(input) }),
  updateClient: (id: number, input: Partial<ClientInput>) =>
    http<Client>(`/api/clients/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteClient: (id: number) => http<void>(`/api/clients/${id}`, { method: "DELETE" }),

  listDeals: (params: DealListParams = {}) => http<Paginated<Deal>>(`/api/deals${qs({ ...params })}`),
  createDeal: (input: DealInput) => http<Deal>("/api/deals", { method: "POST", body: JSON.stringify(input) }),
  updateDeal: (id: number, input: Partial<DealInput>) =>
    http<Deal>(`/api/deals/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteDeal: (id: number) => http<void>(`/api/deals/${id}`, { method: "DELETE" }),
};

/** Loads all clients (used for select options and name lookup). */
export async function fetchAllClients(): Promise<Client[]> {
  const all: Client[] = [];
  let page = 1;
  for (;;) {
    const res = await api.listClients({ page, pageSize: 50 });
    all.push(...res.data);
    if (page >= res.pagination.totalPages) break;
    page += 1;
  }
  return all;
}

/** Loads all deals matching optional filters (used by the pipeline). */
export async function fetchAllDeals(params: Omit<DealListParams, "page" | "pageSize"> = {}): Promise<Deal[]> {
  const all: Deal[] = [];
  let page = 1;
  for (;;) {
    const res = await api.listDeals({ ...params, page, pageSize: 50 });
    all.push(...res.data);
    if (page >= res.pagination.totalPages) break;
    page += 1;
  }
  return all;
}

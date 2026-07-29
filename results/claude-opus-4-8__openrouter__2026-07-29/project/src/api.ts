import {
  Client,
  Dashboard,
  Deal,
  Paginated,
  Stage,
} from "./types";

const BASE = "/api";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as any)?.error ?? "Ocorreu um erro inesperado.");
  }
  return body as T;
}

export interface ClientQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface DealQuery {
  search?: string;
  stage?: string;
  clientId?: number;
  page?: number;
  pageSize?: number;
}

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const api = {
  getDashboard: () => request<Dashboard>("/dashboard"),

  listClients: (q: ClientQuery) =>
    request<Paginated<Client>>(`/clients${qs(q as Record<string, unknown>)}`),
  createClient: (data: { name: string; email: string; company: string | null }) =>
    request<Client>("/clients", { method: "POST", body: JSON.stringify(data) }),
  updateClient: (id: number, data: Partial<{ name: string; email: string; company: string | null }>) =>
    request<Client>(`/clients/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteClient: (id: number) =>
    request<void>(`/clients/${id}`, { method: "DELETE" }),

  listDeals: (q: DealQuery) =>
    request<Paginated<Deal>>(`/deals${qs(q as Record<string, unknown>)}`),
  createDeal: (data: { title: string; valueInCents: number; clientId: number; stage: Stage }) =>
    request<Deal>("/deals", { method: "POST", body: JSON.stringify(data) }),
  updateDeal: (id: number, data: Partial<{ title: string; valueInCents: number; clientId: number; stage: Stage }>) =>
    request<Deal>(`/deals/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteDeal: (id: number) =>
    request<void>(`/deals/${id}`, { method: "DELETE" }),
};

export function formatCurrency(valueInCents: number): string {
  return (valueInCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

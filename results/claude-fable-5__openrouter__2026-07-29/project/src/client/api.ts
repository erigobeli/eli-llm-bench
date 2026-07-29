export interface Client {
  id: number;
  name: string;
  email: string;
  company: string | null;
  createdAt: string;
  updatedAt: string;
}

export type Stage = "new" | "contact" | "proposal" | "won";

export interface Deal {
  id: number;
  title: string;
  valueInCents: number;
  clientId: number;
  stage: Stage;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface DashboardMetrics {
  totalClients: number;
  openDeals: number;
  pipelineValueInCents: number;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init
  });
  if (res.status === 204) return undefined as T;
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // corpo vazio ou inválido
  }
  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : "Erro inesperado ao comunicar com o servidor.";
    throw new ApiError(res.status, message);
  }
  return body as T;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const api = {
  health: () => request<{ status: string }>("/api/health"),
  dashboard: () => request<DashboardMetrics>("/api/dashboard"),

  listClients: (params: { search?: string; page?: number; pageSize?: number }) =>
    request<Paginated<Client>>(`/api/clients${buildQuery(params)}`),
  createClient: (payload: { name: string; email: string; company?: string | null }) =>
    request<Client>("/api/clients", { method: "POST", body: JSON.stringify(payload) }),
  updateClient: (id: number, payload: Partial<Pick<Client, "name" | "email" | "company">>) =>
    request<Client>(`/api/clients/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteClient: (id: number) =>
    request<void>(`/api/clients/${id}`, { method: "DELETE" }),

  listDeals: (params: {
    search?: string;
    stage?: string;
    clientId?: number | string;
    page?: number;
    pageSize?: number;
  }) => request<Paginated<Deal>>(`/api/deals${buildQuery(params)}`),
  createDeal: (payload: {
    title: string;
    valueInCents: number;
    clientId: number;
    stage: Stage;
  }) => request<Deal>("/api/deals", { method: "POST", body: JSON.stringify(payload) }),
  updateDeal: (
    id: number,
    payload: Partial<Pick<Deal, "title" | "valueInCents" | "clientId" | "stage">>
  ) => request<Deal>(`/api/deals/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteDeal: (id: number) => request<void>(`/api/deals/${id}`, { method: "DELETE" })
};

export const STAGE_LABELS: Record<Stage, string> = {
  new: "Novo",
  contact: "Em contato",
  proposal: "Proposta",
  won: "Fechado"
};

export const STAGE_ORDER: Stage[] = ["new", "contact", "proposal", "won"];

export function formatCurrency(valueInCents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(valueInCents / 100);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "UTC"
  }).format(new Date(iso));
}

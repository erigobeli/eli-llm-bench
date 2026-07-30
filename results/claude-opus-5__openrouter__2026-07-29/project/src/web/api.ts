import type {
  Client,
  DashboardMetrics,
  Deal,
  Paged,
  Stage,
} from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new Error("Não foi possível comunicar com o servidor.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text.length > 0) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `Falha na requisição (${response.status}).`;
    throw new Error(message);
  }

  return payload as T;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") {
      continue;
    }
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
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
  dashboard: () => request<DashboardMetrics>("/api/dashboard"),

  listClients: (params: { search?: string; page?: number; pageSize?: number }) =>
    request<Paged<Client>>(`/api/clients${buildQuery(params)}`),

  createClient: (payload: ClientPayload) =>
    request<Client>("/api/clients", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateClient: (id: number, payload: Partial<ClientPayload>) =>
    request<Client>(`/api/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteClient: (id: number) =>
    request<void>(`/api/clients/${id}`, { method: "DELETE" }),

  listDeals: (params: {
    search?: string;
    stage?: string;
    clientId?: number | string;
    page?: number;
    pageSize?: number;
  }) => request<Paged<Deal>>(`/api/deals${buildQuery(params)}`),

  createDeal: (payload: DealPayload) =>
    request<Deal>("/api/deals", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateDeal: (id: number, payload: Partial<DealPayload>) =>
    request<Deal>(`/api/deals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteDeal: (id: number) => request<void>(`/api/deals/${id}`, { method: "DELETE" }),
};

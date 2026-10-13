export type Stage = "new" | "contact" | "proposal" | "won";

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

export interface Paged<T> {
  data: T[];
  pagination: Pagination;
}

export interface Dashboard {
  totalClients: number;
  openDeals: number;
  pipelineValueInCents: number;
}

export const STAGES: { value: Stage; label: string }[] = [
  { value: "new", label: "Novo" },
  { value: "contact", label: "Em contato" },
  { value: "proposal", label: "Proposta" },
  { value: "won", label: "Fechado" },
];

export const stageLabel = (s: Stage) => STAGES.find((x) => x.value === s)?.label ?? s;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Não foi possível conectar ao servidor.");
  }
  if (res.status === 204) return undefined as T;
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  if (!res.ok) {
    const msg =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `Erro inesperado (${res.status}).`;
    throw new ApiError(res.status, msg);
  }
  return payload as T;
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
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

export const api = {
  dashboard: () => request<Dashboard>("GET", "/api/dashboard"),
  listClients: (p: { search?: string; page?: number; pageSize?: number }) =>
    request<Paged<Client>>("GET", `/api/clients${qs(p)}`),
  createClient: (input: ClientInput) => request<Client>("POST", "/api/clients", input),
  updateClient: (id: number, input: Partial<ClientInput>) => request<Client>("PATCH", `/api/clients/${id}`, input),
  deleteClient: (id: number) => request<void>("DELETE", `/api/clients/${id}`),
  listDeals: (p: { search?: string; stage?: string; clientId?: number | string; page?: number; pageSize?: number }) =>
    request<Paged<Deal>>("GET", `/api/deals${qs(p)}`),
  createDeal: (input: DealInput) => request<Deal>("POST", "/api/deals", input),
  updateDeal: (id: number, input: Partial<DealInput>) => request<Deal>("PATCH", `/api/deals/${id}`, input),
  deleteDeal: (id: number) => request<void>("DELETE", `/api/deals/${id}`),

  async allClients(): Promise<Client[]> {
    const out: Client[] = [];
    for (let page = 1; ; page++) {
      const r = await api.listClients({ page, pageSize: 50 });
      out.push(...r.data);
      if (page >= r.pagination.totalPages) break;
    }
    return out;
  },
  async allDeals(): Promise<Deal[]> {
    const out: Deal[] = [];
    for (let page = 1; ; page++) {
      const r = await api.listDeals({ page, pageSize: 50 });
      out.push(...r.data);
      if (page >= r.pagination.totalPages) break;
    }
    return out;
  },
};

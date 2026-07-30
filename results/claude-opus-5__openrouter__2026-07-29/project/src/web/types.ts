export const STAGES = ["new", "contact", "proposal", "won"] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  new: "Novo",
  contact: "Em contato",
  proposal: "Proposta",
  won: "Fechado",
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

export interface Paged<T> {
  data: T[];
  pagination: Pagination;
}

export interface DashboardMetrics {
  totalClients: number;
  openDeals: number;
  pipelineValueInCents: number;
}

/** Registros por página exigidos nas listagens visuais. */
export const UI_PAGE_SIZE = 4;

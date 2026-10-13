export type DealStage = 'new' | 'contact' | 'proposal' | 'won';

export const VALID_STAGES: readonly DealStage[] = ['new', 'contact', 'proposal', 'won'];

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
  stage: DealStage;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface DashboardMetrics {
  totalClients: number;
  openDeals: number;
  pipelineValueInCents: number;
}

export interface SeedData {
  version: string;
  clients: Client[];
  deals: Deal[];
}

export type DealStage = 'new' | 'contact' | 'proposal' | 'won';

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

export interface CreateClientInput {
  name: string;
  email: string;
  company?: string | null;
}

export interface UpdateClientInput {
  name?: string;
  email?: string;
  company?: string | null;
}

export interface CreateDealInput {
  title: string;
  valueInCents: number;
  clientId: number;
  stage: DealStage;
}

export interface UpdateDealInput {
  title?: string;
  valueInCents?: number;
  clientId?: number;
  stage?: DealStage;
}

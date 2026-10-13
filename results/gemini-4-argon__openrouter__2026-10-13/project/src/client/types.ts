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

export const STAGE_LABELS: Record<DealStage, string> = {
  new: 'Novo',
  contact: 'Em contato',
  proposal: 'Proposta',
  won: 'Fechado',
};

export const PIPELINE_STAGES: { stage: DealStage; label: string }[] = [
  { stage: 'new', label: 'Novo' },
  { stage: 'contact', label: 'Em contato' },
  { stage: 'proposal', label: 'Proposta' },
  { stage: 'won', label: 'Fechado' },
];

export function formatCurrency(valueInCents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
    .format(valueInCents / 100)
    .replace(/\u00a0/g, ' ');
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

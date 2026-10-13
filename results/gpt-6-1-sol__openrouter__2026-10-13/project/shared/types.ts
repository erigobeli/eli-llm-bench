export const stages = ['new', 'contact', 'proposal', 'won'] as const;
export type Stage = typeof stages[number];
export const stageLabels: Record<Stage, string> = {
  new: 'Novo', contact: 'Em contato', proposal: 'Proposta', won: 'Fechado',
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
export interface Page<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}
export interface Metrics {
  totalClients: number;
  openDeals: number;
  pipelineValueInCents: number;
}

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
  clientName?: string;
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

export const stageLabels: Record<Stage, string> = {
  new: "Novo",
  contact: "Em contato",
  proposal: "Proposta",
  won: "Fechado"
};

export const stages = Object.keys(stageLabels) as Stage[];

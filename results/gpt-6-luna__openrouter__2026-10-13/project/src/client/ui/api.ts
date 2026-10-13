export type Stage = 'new' | 'contact' | 'proposal' | 'won';

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

export interface Dashboard {
  totalClients: number;
  openDeals: number;
  pipelineValueInCents: number;
}

export async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  if (!response.ok) {
    let message = 'Não foi possível concluir a operação.';
    try {
      const body = await response.json() as { error?: string };
      if (body.error) message = body.error;
    } catch { /* resposta sem JSON */ }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

export const stageLabels: Record<Stage, string> = {
  new: 'Novo',
  contact: 'Em contato',
  proposal: 'Proposta',
  won: 'Fechado',
};

export const stageOrder: Stage[] = ['new', 'contact', 'proposal', 'won'];

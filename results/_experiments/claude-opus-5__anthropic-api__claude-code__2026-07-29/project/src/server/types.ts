export const STAGES = ['new', 'contact', 'proposal', 'won'] as const;

export type Stage = (typeof STAGES)[number];

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

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

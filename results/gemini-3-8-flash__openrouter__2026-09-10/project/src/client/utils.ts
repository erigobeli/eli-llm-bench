import { DealStage } from '../shared/types.js';

export function formatCurrencyBRL(valueInCents: number): string {
  const value = (valueInCents || 0) / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function parseBRLToCents(val: string | number): number {
  if (typeof val === 'number') {
    return Math.round(val);
  }
  if (!val) return 0;
  // If user entered formatted currency like "1.200,50" or "1200.50" or just integer
  const cleaned = val.replace(/[R$\s.]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function formatDateBR(isoString: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(d);
  } catch {
    return isoString;
  }
}

export const STAGES: { key: DealStage; label: string }[] = [
  { key: 'new', label: 'Novo' },
  { key: 'contact', label: 'Em contato' },
  { key: 'proposal', label: 'Proposta' },
  { key: 'won', label: 'Fechado' },
];

export const STAGE_LABELS: Record<DealStage, string> = {
  new: 'Novo',
  contact: 'Em contato',
  proposal: 'Proposta',
  won: 'Fechado',
};

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** Formata centavos como moeda brasileira. */
export function formatCurrency(valueInCents: number): string {
  return currency.format((Number.isFinite(valueInCents) ? valueInCents : 0) / 100);
}

export function formatDate(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? '—' : dateTime.format(parsed);
}

/** Converte um texto em reais ("1.500,50" ou "1500.5") para centavos. */
export function reaisToCents(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s|R\$/g, '');
  if (cleaned === '') return null;
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

export function centsToReaisInput(valueInCents: number): string {
  return (valueInCents / 100).toFixed(2);
}

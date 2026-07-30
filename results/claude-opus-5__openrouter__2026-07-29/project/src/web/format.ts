const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatCents(valueInCents: number): string {
  return currency.format((Number(valueInCents) || 0) / 100);
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return dateFormatter.format(date);
}

/** Converte texto digitado em reais ("1.234,56" ou "1234.56") para centavos. */
export function parseCurrencyToCents(input: string): number | null {
  const raw = input.trim();
  if (raw === "") {
    return null;
  }
  let normalized = raw.replace(/[R$\s]/g, "");
  if (normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  }
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }
  return Math.round(numeric * 100);
}

export function centsToInput(valueInCents: number): string {
  return (valueInCents / 100).toFixed(2).replace(".", ",");
}

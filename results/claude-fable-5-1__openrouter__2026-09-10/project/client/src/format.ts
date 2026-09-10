const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatCents(cents: number): string {
  return brl.format(cents / 100);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Converte texto digitado ("1.234,56" ou "1234.56") em centavos inteiros; null quando inválido. */
export function parseCurrencyInput(raw: string): number | null {
  const s = raw.trim().replace(/R\$\s?/g, "");
  if (!s) return null;
  let normalized = s;
  if (s.includes(",")) {
    normalized = s.replace(/\./g, "").replace(",", ".");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Math.round(Number(normalized) * 100);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

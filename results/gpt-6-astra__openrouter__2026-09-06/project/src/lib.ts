import { useEffect, useState } from "react";
import type { Page, Stage } from "../shared/types";

export const stageLabels: Record<Stage, string> = {
  new: "Novo",
  contact: "Em contato",
  proposal: "Proposta",
  won: "Fechado",
};
export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export const date = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.error || "Não foi possível conectar ao servidor. Tente novamente.",
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

// Used by the board and relationship selectors, which must include every page.
export async function allRecords<T>(
  url: string,
  signal?: AbortSignal,
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = await api<Page<T>>(
      `${url}${url.includes("?") ? "&" : "?"}pageSize=50&page=${page}`,
      { signal },
    );
    items.push(...result.data);
    totalPages = result.pagination.totalPages;
    page++;
  } while (page <= totalPages);
  return items;
}

export function useResource<T>(url: string, revision = 0, all = false) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const load = all
      ? (allRecords(url, controller.signal) as Promise<T>)
      : api<T>(url, { signal: controller.signal });
    load
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "Ocorreu um erro ao carregar os dados.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [url, revision, all, retryCount]);
  return { data, loading, error, retry: () => setRetryCount((n) => n + 1) };
}

export function parseMoney(value: string): number {
  let clean = value.trim().replace(/^R\$\s*/, "");
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(clean))
    clean = clean.replaceAll(".", "");
  if (!/^\d+([,.]\d{1,2})?$/.test(clean))
    throw new Error(
      "Informe um valor válido, como 1.250,00, sem valores negativos.",
    );
  const [whole, fraction = ""] = clean.replace(",", ".").split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents))
    throw new Error("O valor informado é muito alto.");
  return cents;
}

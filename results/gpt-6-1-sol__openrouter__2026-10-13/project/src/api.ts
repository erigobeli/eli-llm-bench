import { useEffect, useState } from 'react';
import type { Page } from '../shared/types';

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'Não foi possível conectar ao servidor. Tente novamente.');
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
export async function allRecords<T>(path: string, signal?: AbortSignal): Promise<T[]> {
  const records: T[] = [];
  let page = 1;
  while (true) {
    const result = await api<Page<T>>(`${path}?page=${page}&pageSize=50`, { signal });
    records.push(...result.data);
    if (page >= result.pagination.totalPages) return records;
    page++;
  }
}
export function useResource<T>(loader: (signal: AbortSignal) => Promise<T>, dependencies: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    loader(controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result);
    }).catch(reason => {
      if (!controller.signal.aborted) setError(message(reason));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
    // The caller explicitly provides every value used by its loader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, reload]);
  return { data, loading, error, refresh: () => setReload(value => value + 1) };
}
export function useDebounced(value: string, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
export const message = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
export const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export const shortDate = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(iso));

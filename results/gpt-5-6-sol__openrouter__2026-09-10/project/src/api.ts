export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: options?.body ? { "Content-Type": "application/json", ...options.headers } : options?.headers
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "Não foi possível concluir a operação." }));
    throw new Error(body.error || "Não foi possível concluir a operação.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function queryString(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  return params.toString();
}

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function badRequest(message: string): HttpError {
  return new HttpError(400, message);
}

export function notFound(message: string): HttpError {
  return new HttpError(404, message);
}

export function conflict(message: string): HttpError {
  return new HttpError(409, message);
}

export interface PageParams {
  page: number;
  pageSize: number;
  offset: number;
}

function parseIntParam(raw: unknown, name: string, min: number, max: number, fallback: number): number {
  if (raw === undefined || raw === '') return fallback;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw badRequest(`O parâmetro ${name} deve ser um número inteiro.`);
  }
  const value = Number(raw);
  if (value < min || value > max) {
    throw badRequest(`O parâmetro ${name} deve estar entre ${min} e ${max}.`);
  }
  return value;
}

export function parsePagination(query: Record<string, unknown>): PageParams {
  const page = parseIntParam(query.page, 'page', 1, Number.MAX_SAFE_INTEGER, 1);
  const pageSize = parseIntParam(query.pageSize, 'pageSize', 1, 50, 10);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function parseOptionalText(raw: unknown, name: string): string | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== 'string') throw badRequest(`O parâmetro ${name} é inválido.`);
  const trimmed = raw.trim();
  return trimmed === '' ? undefined : trimmed;
}

export function parseIdParam(raw: unknown): number | null {
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function parseIdQuery(raw: unknown, name: string): number | undefined {
  if (raw === undefined || raw === '') return undefined;
  const id = parseIdParam(raw);
  if (id === null) throw badRequest(`O parâmetro ${name} deve ser um identificador válido.`);
  return id;
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export function paginationMeta(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

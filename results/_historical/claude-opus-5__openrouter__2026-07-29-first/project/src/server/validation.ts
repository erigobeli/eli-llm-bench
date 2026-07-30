import { STAGES, type Stage } from './types';

/** Erro de aplicação com status HTTP e mensagem legível em português. */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const notFound = (message: string) => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);

const EMAIL_REGEX = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseName(value: unknown): string {
  if (typeof value !== 'string') {
    throw badRequest('O nome é obrigatório.');
  }
  const name = value.trim();
  if (name.length < 2 || name.length > 80) {
    throw badRequest('O nome deve ter entre 2 e 80 caracteres.');
  }
  return name;
}

export function parseEmail(value: unknown): string {
  if (typeof value !== 'string') {
    throw badRequest('O e-mail é obrigatório.');
  }
  const email = value.trim();
  if (email.length === 0) {
    throw badRequest('O e-mail é obrigatório.');
  }
  if (email.length > 160 || !EMAIL_REGEX.test(email)) {
    throw badRequest('Informe um e-mail válido.');
  }
  return email;
}

export function parseCompany(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw badRequest('A empresa deve ser um texto.');
  }
  const company = value.trim();
  if (company.length === 0) {
    return null;
  }
  if (company.length > 120) {
    throw badRequest('A empresa deve ter no máximo 120 caracteres.');
  }
  return company;
}

export function parseTitle(value: unknown): string {
  if (typeof value !== 'string') {
    throw badRequest('O título é obrigatório.');
  }
  const title = value.trim();
  if (title.length < 2 || title.length > 120) {
    throw badRequest('O título deve ter entre 2 e 120 caracteres.');
  }
  return title;
}

export function parseValueInCents(value: unknown): number {
  let parsed: number;
  if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'string' && value.trim() !== '' && /^-?\d+$/.test(value.trim())) {
    parsed = Number(value.trim());
  } else {
    throw badRequest('O valor deve ser um número inteiro em centavos, maior ou igual a zero.');
  }
  if (!Number.isInteger(parsed) || parsed < 0 || !Number.isSafeInteger(parsed)) {
    throw badRequest('O valor deve ser um número inteiro em centavos, maior ou igual a zero.');
  }
  return parsed;
}

export function parseStage(value: unknown): Stage {
  if (typeof value !== 'string' || !STAGES.includes(value as Stage)) {
    throw badRequest('A etapa deve ser uma destas: new, contact, proposal, won.');
  }
  return value as Stage;
}

export function parseId(value: unknown, message = 'Identificador inválido.'): number {
  let parsed: number;
  if (typeof value === 'number') {
    parsed = value;
  } else if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    parsed = Number(value.trim());
  } else {
    throw badRequest(message);
  }
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw badRequest(message);
  }
  return parsed;
}

export interface PageQuery {
  page: number;
  pageSize: number;
}

export function parsePageQuery(query: Record<string, unknown>): PageQuery {
  let page = 1;
  let pageSize = 10;

  const rawPage = query.page;
  if (rawPage !== undefined && rawPage !== '') {
    if (typeof rawPage !== 'string' && typeof rawPage !== 'number') {
      throw badRequest('O parâmetro page deve ser um inteiro maior ou igual a 1.');
    }
    const text = String(rawPage).trim();
    if (!/^\d+$/.test(text) || Number(text) < 1) {
      throw badRequest('O parâmetro page deve ser um inteiro maior ou igual a 1.');
    }
    page = Number(text);
  }

  const rawPageSize = query.pageSize;
  if (rawPageSize !== undefined && rawPageSize !== '') {
    if (typeof rawPageSize !== 'string' && typeof rawPageSize !== 'number') {
      throw badRequest('O parâmetro pageSize deve ser um inteiro entre 1 e 50.');
    }
    const text = String(rawPageSize).trim();
    if (!/^\d+$/.test(text) || Number(text) < 1 || Number(text) > 50) {
      throw badRequest('O parâmetro pageSize deve ser um inteiro entre 1 e 50.');
    }
    pageSize = Number(text);
  }

  return { page, pageSize };
}

export function parseSearch(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value !== 'string') {
    throw badRequest('O parâmetro search deve ser um texto.');
  }
  return value.trim();
}

export function nowIso(): string {
  return new Date().toISOString();
}

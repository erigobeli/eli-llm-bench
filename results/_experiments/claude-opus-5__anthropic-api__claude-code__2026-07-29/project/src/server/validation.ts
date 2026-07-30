import { badRequest } from './errors';
import { STAGES, type Stage } from './types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function requireBody(body: unknown): Record<string, unknown> {
  if (!isPlainObject(body)) {
    throw badRequest('Corpo da requisição inválido. Envie um objeto JSON.');
  }
  return body;
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
  if (email.length > 160 || !EMAIL_RE.test(email)) {
    throw badRequest('Informe um e-mail válido.');
  }
  return email;
}

export function parseCompany(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw badRequest('A empresa deve ser um texto.');
  }
  const company = value.trim();
  if (company.length === 0) return null;
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
  const numeric =
    typeof value === 'string' && value.trim() !== '' && /^-?\d+$/.test(value.trim())
      ? Number(value.trim())
      : value;
  if (typeof numeric !== 'number' || !Number.isInteger(numeric) || numeric < 0) {
    throw badRequest('O valor deve ser um número inteiro maior ou igual a zero, em centavos.');
  }
  if (numeric > Number.MAX_SAFE_INTEGER) {
    throw badRequest('O valor informado é grande demais.');
  }
  return numeric;
}

export function parseClientId(value: unknown): number {
  const numeric =
    typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value.trim()) : value;
  if (typeof numeric !== 'number' || !Number.isInteger(numeric) || numeric < 1) {
    throw badRequest('Informe um cliente válido.');
  }
  return numeric;
}

export function parseStage(value: unknown): Stage {
  if (typeof value !== 'string' || !STAGES.includes(value as Stage)) {
    throw badRequest('A etapa deve ser uma destas: new, contact, proposal, won.');
  }
  return value as Stage;
}

/** Converte o parâmetro `:id` da rota em número inteiro positivo. */
export function parseRouteId(value: string, entity: 'cliente' | 'negócio'): number {
  if (!/^\d+$/.test(value)) {
    throw badRequest(`Identificador de ${entity} inválido.`);
  }
  return Number(value);
}

export interface PaginationInput {
  page: number;
  pageSize: number;
}

export function parsePagination(query: Record<string, unknown>): PaginationInput {
  return {
    page: parsePositiveIntParam(query.page, 1, 1, Number.MAX_SAFE_INTEGER, 'page'),
    pageSize: parsePositiveIntParam(query.pageSize, 10, 1, 50, 'pageSize'),
  };
}

function parsePositiveIntParam(
  raw: unknown,
  fallback: number,
  min: number,
  max: number,
  name: string,
): number {
  if (raw === undefined || raw === null || raw === '') return fallback;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw badRequest(
      name === 'page'
        ? 'O parâmetro page deve ser um número inteiro maior ou igual a 1.'
        : 'O parâmetro pageSize deve ser um número inteiro entre 1 e 50.',
    );
  }
  const parsed = Number(raw);
  if (parsed < min || parsed > max) {
    throw badRequest(
      name === 'page'
        ? 'O parâmetro page deve ser um número inteiro maior ou igual a 1.'
        : 'O parâmetro pageSize deve ser um número inteiro entre 1 e 50.',
    );
  }
  return parsed;
}

export function parseSearch(raw: unknown): string {
  if (raw === undefined || raw === null) return '';
  if (typeof raw !== 'string') {
    throw badRequest('O parâmetro search deve ser um texto.');
  }
  return raw.trim();
}

export function parseOptionalStageFilter(raw: unknown): Stage | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  return parseStage(raw);
}

export function parseOptionalClientIdFilter(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw badRequest('O parâmetro clientId deve ser um número inteiro.');
  }
  return Number(raw);
}

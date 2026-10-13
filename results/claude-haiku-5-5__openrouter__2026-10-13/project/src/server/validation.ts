import { badRequest } from './http.js';

export const STAGES = ['new', 'contact', 'proposal', 'won'] as const;
export type StageValue = (typeof STAGES)[number];

export interface ClientInput {
  name?: string;
  email?: string;
  company?: string | null;
}

export interface DealInput {
  title?: string;
  valueInCents?: number;
  clientId?: number;
  stage?: StageValue;
}

function requireObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw badRequest('O corpo da requisição deve ser um objeto JSON.');
  }
  return body as Record<string, unknown>;
}

function parseName(raw: unknown): string {
  if (typeof raw !== 'string' || raw.trim() === '') throw badRequest('O nome é obrigatório.');
  const name = raw.trim();
  if (name.length < 2 || name.length > 80) {
    throw badRequest('O nome deve ter entre 2 e 80 caracteres.');
  }
  return name;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmail(raw: unknown): string {
  if (typeof raw !== 'string' || raw.trim() === '') throw badRequest('O e-mail é obrigatório.');
  const email = raw.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw badRequest('Informe um e-mail válido.');
  }
  return email;
}

function parseCompany(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') throw badRequest('A empresa deve ser um texto.');
  const company = raw.trim();
  if (company === '') return null;
  if (company.length > 120) throw badRequest('A empresa deve ter no máximo 120 caracteres.');
  return company;
}

/** Em modo parcial (PATCH) só valida os campos presentes no corpo. */
export function parseClientInput(body: unknown, partial: boolean): ClientInput {
  const src = requireObject(body);
  const out: ClientInput = {};
  if (!partial || 'name' in src) out.name = parseName(src.name);
  if (!partial || 'email' in src) out.email = parseEmail(src.email);
  if (!partial || 'company' in src) out.company = parseCompany(src.company);
  return out;
}

function parseTitle(raw: unknown): string {
  if (typeof raw !== 'string' || raw.trim() === '') throw badRequest('O título é obrigatório.');
  const title = raw.trim();
  if (title.length < 2 || title.length > 120) {
    throw badRequest('O título deve ter entre 2 e 120 caracteres.');
  }
  return title;
}

function parseValue(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isSafeInteger(raw) || raw < 0) {
    throw badRequest('O valor deve ser um número inteiro de centavos, maior ou igual a zero.');
  }
  return raw;
}

function parseClientId(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isSafeInteger(raw) || raw <= 0) {
    throw badRequest('Selecione um cliente válido.');
  }
  return raw;
}

function parseStage(raw: unknown): StageValue {
  if (typeof raw !== 'string' || !(STAGES as readonly string[]).includes(raw)) {
    throw badRequest('A etapa informada é inválida.');
  }
  return raw as StageValue;
}

export function parseDealInput(body: unknown, partial: boolean): DealInput {
  const src = requireObject(body);
  const out: DealInput = {};
  if (!partial || 'title' in src) out.title = parseTitle(src.title);
  if (!partial || 'valueInCents' in src) out.valueInCents = parseValue(src.valueInCents);
  if (!partial || 'clientId' in src) out.clientId = parseClientId(src.clientId);
  if (partial ? 'stage' in src : true) out.stage = parseStage(src.stage ?? 'new');
  return out;
}

import { STAGES, type Stage } from "../shared/types";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg);
export const notFound = (msg: string) => new HttpError(404, msg);
export const conflict = (msg: string) => new HttpError(409, msg);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = Record<string, unknown>;

export function ensureObject(body: unknown): Body {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw badRequest("Corpo da requisição deve ser um objeto JSON.");
  }
  return body as Body;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string") throw badRequest(`${label} é obrigatório.`);
  return value.trim();
}

export function parseName(value: unknown): string {
  const name = requireString(value, "Nome");
  if (name.length < 2 || name.length > 80) {
    throw badRequest("Nome deve ter entre 2 e 80 caracteres.");
  }
  return name;
}

export function parseEmail(value: unknown): string {
  const email = requireString(value, "E-mail");
  if (!email || !EMAIL_RE.test(email)) {
    throw badRequest("E-mail inválido.");
  }
  if (email.length > 254) throw badRequest("E-mail muito longo.");
  return email;
}

export function parseCompany(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw badRequest("Empresa deve ser um texto.");
  const company = value.trim();
  if (company.length === 0) return null;
  if (company.length > 120) throw badRequest("Empresa deve ter no máximo 120 caracteres.");
  return company;
}

export function parseTitle(value: unknown): string {
  const title = requireString(value, "Título");
  if (title.length < 2 || title.length > 120) {
    throw badRequest("Título deve ter entre 2 e 120 caracteres.");
  }
  return title;
}

export function parseValueInCents(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw badRequest("Valor deve ser um inteiro em centavos maior ou igual a zero.");
  }
  return value;
}

export function parseClientId(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw badRequest("Cliente inválido.");
  }
  return value;
}

export function parseStage(value: unknown): Stage {
  if (typeof value !== "string" || !(STAGES as readonly string[]).includes(value)) {
    throw badRequest("Etapa inválida. Use: new, contact, proposal ou won.");
  }
  return value as Stage;
}

export function parseIdParam(raw: string | undefined, label: string): number {
  const id = Number(raw);
  if (!raw || !Number.isInteger(id) || id < 1) throw notFound(`${label} não encontrado.`);
  return id;
}

export interface PagingQuery {
  page: number;
  pageSize: number;
  offset: number;
}

function firstString(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return typeof value === "string" ? value : undefined;
}

export function parsePaging(query: Record<string, unknown>): PagingQuery {
  const pageRaw = firstString(query.page);
  const sizeRaw = firstString(query.pageSize);
  let page = 1;
  let pageSize = 10;
  if (pageRaw !== undefined && pageRaw !== "") {
    page = Number(pageRaw);
    if (!Number.isInteger(page) || page < 1) throw badRequest("Parâmetro page deve ser um inteiro a partir de 1.");
  }
  if (sizeRaw !== undefined && sizeRaw !== "") {
    pageSize = Number(sizeRaw);
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
      throw badRequest("Parâmetro pageSize deve ser um inteiro entre 1 e 50.");
    }
  }
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function parseSearch(query: Record<string, unknown>): string | undefined {
  const s = firstString(query.search)?.trim();
  return s ? s : undefined;
}

export function parseOptionalStage(query: Record<string, unknown>): Stage | undefined {
  const s = firstString(query.stage);
  if (s === undefined || s === "") return undefined;
  return parseStage(s);
}

export function parseOptionalClientId(query: Record<string, unknown>): number | undefined {
  const s = firstString(query.clientId);
  if (s === undefined || s === "") return undefined;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 1) throw badRequest("Parâmetro clientId inválido.");
  return n;
}

export function buildPagination(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

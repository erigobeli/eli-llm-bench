import { STAGES, type Stage } from "./domain";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HttpError";
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function requireBody(body: unknown): Record<string, unknown> {
  if (!isPlainObject(body)) {
    throw badRequest("O corpo da requisição deve ser um objeto JSON.");
  }
  return body;
}

export function parseName(value: unknown): string {
  if (typeof value !== "string") {
    throw badRequest("O nome é obrigatório e deve ser um texto.");
  }
  const name = value.trim();
  if (name.length < 2 || name.length > 80) {
    throw badRequest("O nome deve ter entre 2 e 80 caracteres.");
  }
  return name;
}

export function parseEmail(value: unknown): string {
  if (typeof value !== "string") {
    throw badRequest("O e-mail é obrigatório e deve ser um texto.");
  }
  const email = value.trim();
  if (email.length === 0) {
    throw badRequest("O e-mail é obrigatório.");
  }
  if (email.length > 160 || !EMAIL_PATTERN.test(email)) {
    throw badRequest("Informe um e-mail válido.");
  }
  return email;
}

export function parseCompany(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw badRequest("A empresa deve ser um texto.");
  }
  const company = value.trim();
  if (company.length === 0) {
    return null;
  }
  if (company.length > 120) {
    throw badRequest("A empresa deve ter no máximo 120 caracteres.");
  }
  return company;
}

export function parseTitle(value: unknown): string {
  if (typeof value !== "string") {
    throw badRequest("O título é obrigatório e deve ser um texto.");
  }
  const title = value.trim();
  if (title.length < 2 || title.length > 120) {
    throw badRequest("O título deve ter entre 2 e 120 caracteres.");
  }
  return title;
}

export function parseValueInCents(value: unknown): number {
  const numeric =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof numeric !== "number" || !Number.isInteger(numeric) || numeric < 0) {
    throw badRequest("O valor deve ser um número inteiro maior ou igual a zero.");
  }
  return numeric;
}

export function parseStage(value: unknown): Stage {
  if (typeof value !== "string" || !STAGES.includes(value as Stage)) {
    throw badRequest(
      'A etapa deve ser uma destas: "new", "contact", "proposal" ou "won".',
    );
  }
  return value as Stage;
}

export function parseClientId(value: unknown): number {
  const numeric =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof numeric !== "number" || !Number.isInteger(numeric) || numeric < 1) {
    throw badRequest("O cliente informado é inválido.");
  }
  return numeric;
}

export function parseRouteId(value: string): number {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1) {
    throw badRequest("O identificador informado é inválido.");
  }
  return numeric;
}

export function parseSearch(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value !== "string") {
    throw badRequest("O termo de busca deve ser um texto.");
  }
  return value.trim();
}

export interface PageQuery {
  page: number;
  pageSize: number;
}

export function parsePageQuery(query: Record<string, unknown>): PageQuery {
  let page = 1;
  let pageSize = 10;

  if (query.page !== undefined && query.page !== "") {
    const parsed = Number(query.page);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw badRequest("O parâmetro page deve ser um inteiro maior ou igual a 1.");
    }
    page = parsed;
  }

  if (query.pageSize !== undefined && query.pageSize !== "") {
    const parsed = Number(query.pageSize);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
      throw badRequest("O parâmetro pageSize deve ser um inteiro entre 1 e 50.");
    }
    pageSize = parsed;
  }

  return { page, pageSize };
}

export function hasKey(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

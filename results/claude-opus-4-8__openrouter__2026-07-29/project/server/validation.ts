import { STAGES, Stage } from "./types";

export class ValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ClientInput {
  name: string;
  email: string;
  company: string | null;
}

/** Validates a full client payload (for creation). */
export function validateClientCreate(body: any): ClientInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Corpo da requisição inválido.");
  }
  const name = validateName(body.name);
  const email = validateEmail(body.email);
  const company = validateCompany(body.company);
  return { name, email, company };
}

/** Validates a partial client payload (for update). Returns only present fields. */
export function validateClientPatch(body: any): Partial<ClientInput> {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Corpo da requisição inválido.");
  }
  const out: Partial<ClientInput> = {};
  if ("name" in body) out.name = validateName(body.name);
  if ("email" in body) out.email = validateEmail(body.email);
  if ("company" in body) out.company = validateCompany(body.company);
  if (Object.keys(out).length === 0) {
    throw new ValidationError("Nenhum campo válido para atualizar.");
  }
  return out;
}

function validateName(value: any): string {
  if (typeof value !== "string") {
    throw new ValidationError("O nome é obrigatório.");
  }
  const name = value.trim();
  if (name.length < 2 || name.length > 80) {
    throw new ValidationError("O nome deve ter entre 2 e 80 caracteres.");
  }
  return name;
}

function validateEmail(value: any): string {
  if (typeof value !== "string") {
    throw new ValidationError("O e-mail é obrigatório.");
  }
  const email = value.trim();
  if (email.length === 0) {
    throw new ValidationError("O e-mail é obrigatório.");
  }
  if (email !== value) {
    throw new ValidationError("O e-mail não pode conter espaços nas extremidades.");
  }
  if (!EMAIL_RE.test(email)) {
    throw new ValidationError("Informe um e-mail válido.");
  }
  return email;
}

function validateCompany(value: any): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new ValidationError("A empresa deve ser um texto.");
  }
  const company = value.trim();
  return company.length === 0 ? null : company;
}

export interface DealInput {
  title: string;
  valueInCents: number;
  clientId: number;
  stage: Stage;
}

export function validateDealCreate(body: any): DealInput {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Corpo da requisição inválido.");
  }
  const title = validateTitle(body.title);
  const valueInCents = validateValue(body.valueInCents);
  const clientId = validateClientId(body.clientId);
  const stage = validateStage(body.stage);
  return { title, valueInCents, clientId, stage };
}

export function validateDealPatch(body: any): Partial<DealInput> {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Corpo da requisição inválido.");
  }
  const out: Partial<DealInput> = {};
  if ("title" in body) out.title = validateTitle(body.title);
  if ("valueInCents" in body) out.valueInCents = validateValue(body.valueInCents);
  if ("clientId" in body) out.clientId = validateClientId(body.clientId);
  if ("stage" in body) out.stage = validateStage(body.stage);
  if (Object.keys(out).length === 0) {
    throw new ValidationError("Nenhum campo válido para atualizar.");
  }
  return out;
}

function validateTitle(value: any): string {
  if (typeof value !== "string") {
    throw new ValidationError("O título é obrigatório.");
  }
  const title = value.trim();
  if (title.length < 2 || title.length > 120) {
    throw new ValidationError("O título deve ter entre 2 e 120 caracteres.");
  }
  return title;
}

function validateValue(value: any): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ValidationError("O valor deve ser um inteiro maior ou igual a zero.");
  }
  return value;
}

function validateClientId(value: any): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ValidationError("O cliente é obrigatório.");
  }
  return value;
}

function validateStage(value: any): Stage {
  if (typeof value !== "string" || !STAGES.includes(value as Stage)) {
    throw new ValidationError("A etapa é inválida.");
  }
  return value as Stage;
}

/** Parses pagination query params with defaults and bounds. */
export function parsePagination(query: any): { page: number; pageSize: number } {
  let page = parseInt(String(query.page ?? "1"), 10);
  let pageSize = parseInt(String(query.pageSize ?? "10"), 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = 10;
  if (pageSize > 50) pageSize = 50;
  return { page, pageSize };
}

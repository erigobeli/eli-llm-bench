export const STAGES = ["new", "contact", "proposal", "won"] as const;
export type Stage = (typeof STAGES)[number];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class ValidationError extends Error {}

export function nowIso(): string {
  return new Date().toISOString();
}

export function validateName(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError("O nome é obrigatório e deve ser um texto.");
  }
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 80) {
    throw new ValidationError("O nome deve ter entre 2 e 80 caracteres.");
  }
  return trimmed;
}

export function validateEmail(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError("O e-mail é obrigatório e deve ser um texto.");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || !EMAIL_REGEX.test(trimmed)) {
    throw new ValidationError("Informe um e-mail em formato válido.");
  }
  return trimmed;
}

export function validateCompany(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new ValidationError("A empresa deve ser um texto ou nula.");
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function validateTitle(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError("O título é obrigatório e deve ser um texto.");
  }
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 120) {
    throw new ValidationError("O título deve ter entre 2 e 120 caracteres.");
  }
  return trimmed;
}

export function validateValueInCents(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(
      "O valor deve ser um número inteiro de centavos maior ou igual a zero."
    );
  }
  return value;
}

export function validateStage(value: unknown): Stage {
  if (typeof value !== "string" || !STAGES.includes(value as Stage)) {
    throw new ValidationError(
      "A etapa deve ser uma destas: new, contact, proposal ou won."
    );
  }
  return value as Stage;
}

export function validateClientIdValue(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new ValidationError("O cliente informado é inválido.");
  }
  return value;
}

export interface Pagination {
  page: number;
  pageSize: number;
}

export function parsePagination(query: Record<string, unknown>): Pagination {
  let page = 1;
  let pageSize = 10;
  if (query.page !== undefined) {
    const n = Number(query.page);
    if (!Number.isInteger(n) || n < 1) {
      throw new ValidationError("O parâmetro page deve ser um inteiro a partir de 1.");
    }
    page = n;
  }
  if (query.pageSize !== undefined) {
    const n = Number(query.pageSize);
    if (!Number.isInteger(n) || n < 1 || n > 50) {
      throw new ValidationError("O parâmetro pageSize deve ser um inteiro entre 1 e 50.");
    }
    pageSize = n;
  }
  return { page, pageSize };
}

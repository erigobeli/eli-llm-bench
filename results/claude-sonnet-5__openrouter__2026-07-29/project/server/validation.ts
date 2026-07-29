import { DEAL_STAGES, type DealStage } from "./types.js";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseClientCreateInput(body: unknown): {
  name: string;
  email: string;
  company: string | null;
} {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Corpo da requisição inválido.");
  }
  const input = body as Record<string, unknown>;

  const rawName = input.name;
  if (typeof rawName !== "string") {
    throw new ValidationError("Nome é obrigatório.");
  }
  const name = rawName.trim();
  if (name.length < 2 || name.length > 80) {
    throw new ValidationError("Nome deve ter entre 2 e 80 caracteres.");
  }

  const rawEmail = input.email;
  if (typeof rawEmail !== "string") {
    throw new ValidationError("E-mail é obrigatório.");
  }
  const email = rawEmail.trim();
  if (email.length === 0 || !EMAIL_REGEX.test(email)) {
    throw new ValidationError("E-mail inválido.");
  }

  let company: string | null = null;
  if (input.company !== undefined && input.company !== null) {
    if (typeof input.company !== "string") {
      throw new ValidationError("Empresa deve ser um texto.");
    }
    const trimmed = input.company.trim();
    company = trimmed.length > 0 ? trimmed : null;
  }

  return { name, email, company };
}

export function parseClientUpdateInput(body: unknown): {
  name?: string;
  email?: string;
  company?: string | null;
} {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Corpo da requisição inválido.");
  }
  const input = body as Record<string, unknown>;
  const result: { name?: string; email?: string; company?: string | null } = {};

  if (input.name !== undefined) {
    if (typeof input.name !== "string") {
      throw new ValidationError("Nome deve ser um texto.");
    }
    const name = input.name.trim();
    if (name.length < 2 || name.length > 80) {
      throw new ValidationError("Nome deve ter entre 2 e 80 caracteres.");
    }
    result.name = name;
  }

  if (input.email !== undefined) {
    if (typeof input.email !== "string") {
      throw new ValidationError("E-mail deve ser um texto.");
    }
    const email = input.email.trim();
    if (email.length === 0 || !EMAIL_REGEX.test(email)) {
      throw new ValidationError("E-mail inválido.");
    }
    result.email = email;
  }

  if (input.company !== undefined) {
    if (input.company === null) {
      result.company = null;
    } else if (typeof input.company === "string") {
      const trimmed = input.company.trim();
      result.company = trimmed.length > 0 ? trimmed : null;
    } else {
      throw new ValidationError("Empresa deve ser um texto.");
    }
  }

  return result;
}

export function parseDealCreateInput(body: unknown): {
  title: string;
  valueInCents: number;
  clientId: number;
  stage: DealStage;
} {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Corpo da requisição inválido.");
  }
  const input = body as Record<string, unknown>;

  const rawTitle = input.title;
  if (typeof rawTitle !== "string") {
    throw new ValidationError("Título é obrigatório.");
  }
  const title = rawTitle.trim();
  if (title.length < 2 || title.length > 120) {
    throw new ValidationError("Título deve ter entre 2 e 120 caracteres.");
  }

  const valueInCents = input.valueInCents;
  if (typeof valueInCents !== "number" || !Number.isInteger(valueInCents) || valueInCents < 0) {
    throw new ValidationError("Valor deve ser um número inteiro maior ou igual a zero.");
  }

  const clientId = input.clientId;
  if (typeof clientId !== "number" || !Number.isInteger(clientId) || clientId <= 0) {
    throw new ValidationError("Cliente é obrigatório.");
  }

  const stage = input.stage;
  if (typeof stage !== "string" || !DEAL_STAGES.includes(stage as DealStage)) {
    throw new ValidationError("Etapa inválida.");
  }

  return { title, valueInCents, clientId, stage: stage as DealStage };
}

export function parseDealUpdateInput(body: unknown): {
  title?: string;
  valueInCents?: number;
  clientId?: number;
  stage?: DealStage;
} {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Corpo da requisição inválido.");
  }
  const input = body as Record<string, unknown>;
  const result: {
    title?: string;
    valueInCents?: number;
    clientId?: number;
    stage?: DealStage;
  } = {};

  if (input.title !== undefined) {
    if (typeof input.title !== "string") {
      throw new ValidationError("Título deve ser um texto.");
    }
    const title = input.title.trim();
    if (title.length < 2 || title.length > 120) {
      throw new ValidationError("Título deve ter entre 2 e 120 caracteres.");
    }
    result.title = title;
  }

  if (input.valueInCents !== undefined) {
    if (
      typeof input.valueInCents !== "number" ||
      !Number.isInteger(input.valueInCents) ||
      input.valueInCents < 0
    ) {
      throw new ValidationError("Valor deve ser um número inteiro maior ou igual a zero.");
    }
    result.valueInCents = input.valueInCents;
  }

  if (input.clientId !== undefined) {
    if (typeof input.clientId !== "number" || !Number.isInteger(input.clientId) || input.clientId <= 0) {
      throw new ValidationError("Cliente inválido.");
    }
    result.clientId = input.clientId;
  }

  if (input.stage !== undefined) {
    if (typeof input.stage !== "string" || !DEAL_STAGES.includes(input.stage as DealStage)) {
      throw new ValidationError("Etapa inválida.");
    }
    result.stage = input.stage as DealStage;
  }

  return result;
}

export function parsePagination(query: Record<string, unknown>): { page: number; pageSize: number } {
  let page = 1;
  let pageSize = 10;

  if (query.page !== undefined) {
    const parsed = Number(query.page);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new ValidationError("Parâmetro page inválido.");
    }
    page = parsed;
  }

  if (query.pageSize !== undefined) {
    const parsed = Number(query.pageSize);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
      throw new ValidationError("Parâmetro pageSize inválido.");
    }
    pageSize = parsed;
  }

  return { page, pageSize };
}

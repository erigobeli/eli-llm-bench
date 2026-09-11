import type { Request, Response } from 'express';

export const STAGES = ['new', 'contact', 'proposal', 'won'] as const;
export type Stage = (typeof STAGES)[number];

export function isStage(value: unknown): value is Stage {
  return typeof value === 'string' && (STAGES as readonly string[]).includes(value);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({ error: message });
}

export function parsePage(value: unknown, fallback = 1): number {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return n;
}

export function parsePageSize(value: unknown, fallback = 10): number {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  if (n < 1) return 1;
  if (n > 50) return 50;
  return n;
}

export interface PageQuery {
  page: number;
  pageSize: number;
}

export function readPagination(req: Request): PageQuery {
  return {
    page: parsePage(req.query.page, 1),
    pageSize: parsePageSize(req.query.pageSize, 10),
  };
}

export function toInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && /^-?\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }
  return null;
}

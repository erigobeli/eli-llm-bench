import { getDb } from "../db.js";
import type { Client, ListResult } from "../types.js";

interface ClientRow {
  id: number;
  name: string;
  email: string;
  email_lower: string;
  company: string | null;
  created_at: string;
  updated_at: string;
}

function rowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function findClientById(id: number): Client | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as ClientRow | undefined;
  return row ? rowToClient(row) : null;
}

export function findClientByEmailLower(emailLower: string, excludeId?: number): Client | null {
  const db = getDb();
  const row = excludeId
    ? (db
        .prepare("SELECT * FROM clients WHERE email_lower = ? AND id != ?")
        .get(emailLower, excludeId) as ClientRow | undefined)
    : (db.prepare("SELECT * FROM clients WHERE email_lower = ?").get(emailLower) as ClientRow | undefined);
  return row ? rowToClient(row) : null;
}

export function listClients(params: {
  search?: string;
  page: number;
  pageSize: number;
}): ListResult<Client> {
  const db = getDb();
  const { search, page, pageSize } = params;

  let whereClause = "";
  const args: unknown[] = [];

  if (search && search.trim().length > 0) {
    whereClause = "WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(COALESCE(company, '')) LIKE ?";
    const pattern = `%${search.trim().toLowerCase()}%`;
    args.push(pattern, pattern, pattern);
  }

  const total = (
    db.prepare(`SELECT COUNT(*) as count FROM clients ${whereClause}`).get(...args) as { count: number }
  ).count;

  const offset = (page - 1) * pageSize;
  const rows = db
    .prepare(`SELECT * FROM clients ${whereClause} ORDER BY id ASC LIMIT ? OFFSET ?`)
    .all(...args, pageSize, offset) as ClientRow[];

  return {
    data: rows.map(rowToClient),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  };
}

export function createClient(input: { name: string; email: string; company: string | null }): Client {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO clients (name, email, email_lower, company, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(input.name, input.email, input.email.toLowerCase(), input.company, now, now);
  return findClientById(Number(result.lastInsertRowid)) as Client;
}

export function updateClient(
  id: number,
  input: { name?: string; email?: string; company?: string | null }
): Client | null {
  const db = getDb();
  const existing = findClientById(id);
  if (!existing) {
    return null;
  }

  const name = input.name !== undefined ? input.name : existing.name;
  const email = input.email !== undefined ? input.email : existing.email;
  const company = input.company !== undefined ? input.company : existing.company;
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE clients SET name = ?, email = ?, email_lower = ?, company = ?, updated_at = ? WHERE id = ?`
  ).run(name, email, email.toLowerCase(), company, now, id);

  return findClientById(id);
}

export function deleteClient(id: number): { deleted: boolean; hasDeals: boolean } {
  const db = getDb();
  const existing = findClientById(id);
  if (!existing) {
    return { deleted: false, hasDeals: false };
  }

  const dealCount = (
    db.prepare("SELECT COUNT(*) as count FROM deals WHERE client_id = ?").get(id) as { count: number }
  ).count;

  if (dealCount > 0) {
    return { deleted: false, hasDeals: true };
  }

  db.prepare("DELETE FROM clients WHERE id = ?").run(id);
  return { deleted: true, hasDeals: false };
}

export function countClients(): number {
  const db = getDb();
  return (db.prepare("SELECT COUNT(*) as count FROM clients").get() as { count: number }).count;
}

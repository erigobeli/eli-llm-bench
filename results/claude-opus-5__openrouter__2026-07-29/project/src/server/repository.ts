import type { Db } from "./db";
import type {
  Client,
  DashboardMetrics,
  Deal,
  Paged,
  Pagination,
  Stage,
} from "./domain";

interface ClientRow {
  id: number;
  name: string;
  email: string;
  company: string | null;
  createdAt: string;
  updatedAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Guarantees a strictly newer `updatedAt` even when two writes land on the same ms. */
function nextUpdatedAt(previous: string): string {
  const now = nowIso();
  if (now > previous) {
    return now;
  }
  return new Date(new Date(previous).getTime() + 1).toISOString();
}

function buildPagination(total: number, page: number, pageSize: number): Pagination {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  return { page, pageSize, total, totalPages };
}

function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    company: row.company === undefined ? null : row.company,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapDeal(row: Deal): Deal {
  return {
    id: row.id,
    title: row.title,
    valueInCents: row.valueInCents,
    clientId: row.clientId,
    stage: row.stage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const CLIENT_COLUMNS = "id, name, email, company, createdAt, updatedAt";
const DEAL_COLUMNS = "id, title, valueInCents, clientId, stage, createdAt, updatedAt";

export interface ListClientsParams {
  search: string;
  page: number;
  pageSize: number;
}

export interface ListDealsParams {
  search: string;
  stage?: Stage;
  clientId?: number;
  page: number;
  pageSize: number;
}

export class Repository {
  constructor(private readonly db: Db) {}

  /* ----------------------------- clients ----------------------------- */

  listClients(params: ListClientsParams): Paged<Client> {
    const where: string[] = [];
    const values: unknown[] = [];

    if (params.search !== "") {
      where.push(
        "(instr(lc(name), lc(?)) > 0 OR instr(lc(email), lc(?)) > 0 OR instr(lc(COALESCE(company, '')), lc(?)) > 0)",
      );
      values.push(params.search, params.search, params.search);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const total = this.db
      .prepare(`SELECT COUNT(*) AS total FROM clients ${whereSql}`)
      .get(...values) as { total: number };

    const offset = (params.page - 1) * params.pageSize;
    const rows = this.db
      .prepare(
        `SELECT ${CLIENT_COLUMNS} FROM clients ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
      )
      .all(...values, params.pageSize, offset) as ClientRow[];

    return {
      data: rows.map(mapClient),
      pagination: buildPagination(total.total, params.page, params.pageSize),
    };
  }

  getClient(id: number): Client | null {
    const row = this.db
      .prepare(`SELECT ${CLIENT_COLUMNS} FROM clients WHERE id = ?`)
      .get(id) as ClientRow | undefined;
    return row ? mapClient(row) : null;
  }

  findClientByEmail(email: string, ignoreId?: number): Client | null {
    const row = (
      ignoreId === undefined
        ? this.db
            .prepare(`SELECT ${CLIENT_COLUMNS} FROM clients WHERE emailLower = ?`)
            .get(email.toLowerCase())
        : this.db
            .prepare(
              `SELECT ${CLIENT_COLUMNS} FROM clients WHERE emailLower = ? AND id <> ?`,
            )
            .get(email.toLowerCase(), ignoreId)
    ) as ClientRow | undefined;
    return row ? mapClient(row) : null;
  }

  createClient(input: { name: string; email: string; company: string | null }): Client {
    const timestamp = nowIso();
    const result = this.db
      .prepare(
        `INSERT INTO clients (name, email, emailLower, company, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.name,
        input.email,
        input.email.toLowerCase(),
        input.company,
        timestamp,
        timestamp,
      );
    return this.getClient(Number(result.lastInsertRowid))!;
  }

  updateClient(
    current: Client,
    patch: { name?: string; email?: string; company?: string | null },
  ): Client {
    const name = patch.name !== undefined ? patch.name : current.name;
    const email = patch.email !== undefined ? patch.email : current.email;
    const company = patch.company !== undefined ? patch.company : current.company;
    const updatedAt = nextUpdatedAt(current.updatedAt);

    this.db
      .prepare(
        `UPDATE clients SET name = ?, email = ?, emailLower = ?, company = ?, updatedAt = ?
         WHERE id = ?`,
      )
      .run(name, email, email.toLowerCase(), company, updatedAt, current.id);

    return this.getClient(current.id)!;
  }

  deleteClient(id: number): void {
    this.db.prepare("DELETE FROM clients WHERE id = ?").run(id);
  }

  countDealsByClient(clientId: number): number {
    const row = this.db
      .prepare("SELECT COUNT(*) AS total FROM deals WHERE clientId = ?")
      .get(clientId) as { total: number };
    return row.total;
  }

  /* ------------------------------ deals ------------------------------ */

  listDeals(params: ListDealsParams): Paged<Deal> {
    const where: string[] = [];
    const values: unknown[] = [];

    if (params.search !== "") {
      where.push("instr(lc(title), lc(?)) > 0");
      values.push(params.search);
    }
    if (params.stage !== undefined) {
      where.push("stage = ?");
      values.push(params.stage);
    }
    if (params.clientId !== undefined) {
      where.push("clientId = ?");
      values.push(params.clientId);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const total = this.db
      .prepare(`SELECT COUNT(*) AS total FROM deals ${whereSql}`)
      .get(...values) as { total: number };

    const offset = (params.page - 1) * params.pageSize;
    const rows = this.db
      .prepare(
        `SELECT ${DEAL_COLUMNS} FROM deals ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
      )
      .all(...values, params.pageSize, offset) as Deal[];

    return {
      data: rows.map(mapDeal),
      pagination: buildPagination(total.total, params.page, params.pageSize),
    };
  }

  getDeal(id: number): Deal | null {
    const row = this.db
      .prepare(`SELECT ${DEAL_COLUMNS} FROM deals WHERE id = ?`)
      .get(id) as Deal | undefined;
    return row ? mapDeal(row) : null;
  }

  createDeal(input: {
    title: string;
    valueInCents: number;
    clientId: number;
    stage: Stage;
  }): Deal {
    const timestamp = nowIso();
    const result = this.db
      .prepare(
        `INSERT INTO deals (title, valueInCents, clientId, stage, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.title,
        input.valueInCents,
        input.clientId,
        input.stage,
        timestamp,
        timestamp,
      );
    return this.getDeal(Number(result.lastInsertRowid))!;
  }

  updateDeal(
    current: Deal,
    patch: {
      title?: string;
      valueInCents?: number;
      clientId?: number;
      stage?: Stage;
    },
  ): Deal {
    const title = patch.title !== undefined ? patch.title : current.title;
    const valueInCents =
      patch.valueInCents !== undefined ? patch.valueInCents : current.valueInCents;
    const clientId = patch.clientId !== undefined ? patch.clientId : current.clientId;
    const stage = patch.stage !== undefined ? patch.stage : current.stage;
    const updatedAt = nextUpdatedAt(current.updatedAt);

    this.db
      .prepare(
        `UPDATE deals SET title = ?, valueInCents = ?, clientId = ?, stage = ?, updatedAt = ?
         WHERE id = ?`,
      )
      .run(title, valueInCents, clientId, stage, updatedAt, current.id);

    return this.getDeal(current.id)!;
  }

  deleteDeal(id: number): void {
    this.db.prepare("DELETE FROM deals WHERE id = ?").run(id);
  }

  /* ---------------------------- dashboard ---------------------------- */

  dashboard(): DashboardMetrics {
    const clients = this.db
      .prepare("SELECT COUNT(*) AS total FROM clients")
      .get() as { total: number };
    const open = this.db
      .prepare(
        `SELECT COUNT(*) AS total, COALESCE(SUM(valueInCents), 0) AS value
         FROM deals WHERE stage <> 'won'`,
      )
      .get() as { total: number; value: number };

    return {
      totalClients: clients.total,
      openDeals: open.total,
      pipelineValueInCents: open.value,
    };
  }
}

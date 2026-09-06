import express, { type ErrorRequestHandler } from "express";
import type Database from "better-sqlite3";
import { z } from "zod";
import { resolve } from "node:path";
import { stages, type Client, type Deal } from "../shared/types.js";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const clientSchema = z.object(
  {
    name: z
      .string({ error: "Informe o nome." })
      .trim()
      .min(2, "O nome deve ter de 2 a 80 caracteres.")
      .max(80, "O nome deve ter de 2 a 80 caracteres."),
    email: z
      .string({ error: "Informe o e-mail." })
      .trim()
      .toLowerCase()
      .pipe(z.email("Informe um e-mail válido.")),
    company: z
      .string({ error: "Informe uma empresa válida." })
      .trim()
      .nullable()
      .optional()
      .transform((value) => value || null),
  },
  { error: "Envie um objeto JSON válido." },
);
const dealSchema = z.object(
  {
    title: z
      .string({ error: "Informe o título." })
      .trim()
      .min(2, "O título deve ter de 2 a 120 caracteres.")
      .max(120, "O título deve ter de 2 a 120 caracteres."),
    valueInCents: z
      .number({ error: "Informe um valor inteiro em centavos." })
      .int("O valor deve ser inteiro em centavos.")
      .min(0, "O valor não pode ser negativo.")
      .max(Number.MAX_SAFE_INTEGER, "O valor é muito alto."),
    clientId: z
      .number({ error: "Selecione um cliente válido." })
      .int("Selecione um cliente válido.")
      .positive("Selecione um cliente válido."),
    stage: z.enum(stages, { error: "Selecione uma etapa válida." }),
  },
  { error: "Envie um objeto JSON válido." },
);

function integer(
  value: unknown,
  label: string,
  defaultValue?: number,
  max = Number.MAX_SAFE_INTEGER,
) {
  if (value === undefined && defaultValue !== undefined) return defaultValue;
  if (typeof value !== "string" || !/^\d+$/.test(value))
    throw new ApiError(400, `${label} deve ser um inteiro positivo.`);
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > max)
    throw new ApiError(400, `${label} está fora do intervalo permitido.`);
  return n;
}

function updatedTime(previous: string) {
  return new Date(Math.max(Date.now(), Date.parse(previous) + 1)).toISOString();
}

export function createApp(db: Database.Database, publicDir?: string) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.get("/api/dashboard", (_req, res) => {
    res.json({
      totalClients: (
        db.prepare("SELECT COUNT(*) AS total FROM clients").get() as {
          total: number;
        }
      ).total,
      ...(db
        .prepare(
          `SELECT COUNT(*) AS openDeals, COALESCE(SUM(valueInCents), 0) AS pipelineValueInCents FROM deals WHERE stage != 'won'`,
        )
        .get() as object),
    });
  });

  for (const resource of ["clients", "deals"] as const) {
    const isClient = resource === "clients";
    const label = isClient ? "Cliente" : "Negócio";
    const schema = isClient ? clientSchema : dealSchema;
    const getRow = (id: number) => {
      const row = db
        .prepare(`SELECT * FROM ${resource} WHERE id = ?`)
        .get(id) as Client | Deal | undefined;
      if (!row) throw new ApiError(404, `${label} não encontrado.`);
      return row;
    };

    app.get(`/api/${resource}`, (req, res) => {
      const page = integer(req.query.page, "Página", 1);
      const pageSize = integer(req.query.pageSize, "Tamanho da página", 10, 50);
      const where: string[] = [];
      const params: (string | number)[] = [];
      if (req.query.search !== undefined) {
        if (typeof req.query.search !== "string")
          throw new ApiError(400, "Busca inválida.");
        const fields = isClient ? ["name", "email", "company"] : ["title"];
        where.push(
          `(${fields.map((field) => `instr(casefold(${field}), ?) > 0`).join(" OR ")})`,
        );
        params.push(
          ...fields.map(() =>
            (req.query.search as string).trim().toLocaleLowerCase("pt-BR"),
          ),
        );
      }
      if (!isClient && req.query.stage !== undefined) {
        const stage = z
          .enum(stages, { error: "Etapa inválida." })
          .parse(req.query.stage);
        where.push("stage = ?");
        params.push(stage);
      }
      if (!isClient && req.query.clientId !== undefined) {
        where.push("clientId = ?");
        params.push(integer(req.query.clientId, "Cliente"));
      }
      const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const { total } = db
        .prepare(`SELECT COUNT(*) AS total FROM ${resource} ${clause}`)
        .get(...params) as { total: number };
      const offset = (page - 1) * pageSize;
      if (!Number.isSafeInteger(offset))
        throw new ApiError(400, "Página está fora do intervalo permitido.");
      const data = db
        .prepare(
          `SELECT * FROM ${resource} ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`,
        )
        .all(...params, pageSize, offset);
      res.json({
        data,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    });

    app.post(`/api/${resource}`, (req, res) => {
      const data = schema.parse(req.body);
      if (
        !isClient &&
        !db
          .prepare("SELECT id FROM clients WHERE id = ?")
          .get((data as z.infer<typeof dealSchema>).clientId)
      ) {
        throw new ApiError(400, "O cliente selecionado não existe.");
      }
      const now = new Date().toISOString();
      const fields = Object.keys(data);
      const result = db
        .prepare(
          `INSERT INTO ${resource} (${fields.join(", ")}, createdAt, updatedAt) VALUES (${fields.map(() => "?").join(", ")}, ?, ?)`,
        )
        .run(...Object.values(data), now, now);
      res.status(201).json(getRow(Number(result.lastInsertRowid)));
    });

    app.patch(`/api/${resource}/:id`, (req, res) => {
      const id = integer(req.params.id, "Identificador");
      const previous = getRow(id);
      const data = schema.partial().parse(req.body);
      if (
        "clientId" in data &&
        data.clientId !== undefined &&
        !db.prepare("SELECT id FROM clients WHERE id = ?").get(data.clientId)
      ) {
        throw new ApiError(400, "O cliente selecionado não existe.");
      }
      const entries = Object.entries(data).filter(
        ([, value]) => value !== undefined,
      );
      db.prepare(
        `UPDATE ${resource} SET ${entries.map(([key]) => `${key} = ?, `).join("")}updatedAt = ? WHERE id = ?`,
      ).run(
        ...entries.map(([, value]) => value),
        updatedTime(previous.updatedAt),
        id,
      );
      res.json(getRow(id));
    });

    app.delete(`/api/${resource}/:id`, (req, res) => {
      const id = integer(req.params.id, "Identificador");
      getRow(id);
      if (
        isClient &&
        db.prepare("SELECT id FROM deals WHERE clientId = ? LIMIT 1").get(id)
      ) {
        throw new ApiError(
          409,
          "Este cliente possui negócios relacionados e não pode ser excluído.",
        );
      }
      db.prepare(`DELETE FROM ${resource} WHERE id = ?`).run(id);
      res.status(204).end();
    });
  }

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Rota não encontrada." });
  });
  if (publicDir) {
    app.use(express.static(publicDir));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(resolve(publicDir, "index.html"));
    });
  }
  const onError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof ApiError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({ error: error.issues[0]?.message || "Dados inválidos." });
      return;
    }
    if (error?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      res.status(409).json({ error: "Já existe um cliente com este e-mail." });
      return;
    }
    if (error?.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
      res.status(409).json({
        error: "O registro possui um relacionamento que impede esta operação.",
      });
      return;
    }
    if (error?.type === "entity.parse.failed") {
      res
        .status(400)
        .json({ error: "O corpo da requisição deve ser um JSON válido." });
      return;
    }
    if (error?.type === "entity.too.large") {
      res
        .status(400)
        .json({ error: "Os dados enviados excedem o limite permitido." });
      return;
    }
    console.error(
      "Falha interna na API:",
      error instanceof Error ? error.name : "Erro desconhecido",
    );
    res.status(500).json({
      error: "Não foi possível concluir a operação. Tente novamente.",
    });
  };
  app.use(onError);
  return app;
}

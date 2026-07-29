import { Router, type Request, type Response } from "express";
import {
  createClient,
  deleteClient,
  findClientByEmailLower,
  findClientById,
  listClients,
  updateClient
} from "../repositories/clientsRepo.js";
import {
  parseClientCreateInput,
  parseClientUpdateInput,
  parsePagination,
  ValidationError
} from "../validation.js";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  try {
    const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const result = listClients({ search, page, pageSize });
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }
});

router.post("/", (req: Request, res: Response) => {
  try {
    const input = parseClientCreateInput(req.body);
    const existing = findClientByEmailLower(input.email.toLowerCase());
    if (existing) {
      res.status(409).json({ error: "Já existe um cliente com este e-mail." });
      return;
    }
    const client = createClient(input);
    res.status(201).json(client);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }
});

router.patch("/:id", (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Identificador inválido." });
      return;
    }

    const existing = findClientById(id);
    if (!existing) {
      res.status(404).json({ error: "Cliente não encontrado." });
      return;
    }

    const input = parseClientUpdateInput(req.body);

    if (input.email !== undefined) {
      const conflict = findClientByEmailLower(input.email.toLowerCase(), id);
      if (conflict) {
        res.status(409).json({ error: "Já existe um cliente com este e-mail." });
        return;
      }
    }

    const updated = updateClient(id, input);
    res.status(200).json(updated);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }
});

router.delete("/:id", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Identificador inválido." });
    return;
  }

  const result = deleteClient(id);
  if (!result.deleted && !result.hasDeals) {
    res.status(404).json({ error: "Cliente não encontrado." });
    return;
  }
  if (!result.deleted && result.hasDeals) {
    res.status(409).json({ error: "Cliente possui negócios relacionados e não pode ser excluído." });
    return;
  }
  res.status(204).send();
});

export default router;

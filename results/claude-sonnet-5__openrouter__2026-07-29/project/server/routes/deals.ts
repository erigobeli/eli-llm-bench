import { Router, type Request, type Response } from "express";
import { findClientById } from "../repositories/clientsRepo.js";
import {
  createDeal,
  deleteDeal,
  findDealById,
  listDeals,
  updateDeal
} from "../repositories/dealsRepo.js";
import { DEAL_STAGES, type DealStage } from "../types.js";
import {
  parseDealCreateInput,
  parseDealUpdateInput,
  parsePagination,
  ValidationError
} from "../validation.js";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  try {
    const { page, pageSize } = parsePagination(req.query as Record<string, unknown>);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;

    let stage: DealStage | undefined;
    if (req.query.stage !== undefined) {
      if (typeof req.query.stage !== "string" || !DEAL_STAGES.includes(req.query.stage as DealStage)) {
        res.status(400).json({ error: "Parâmetro stage inválido." });
        return;
      }
      stage = req.query.stage as DealStage;
    }

    let clientId: number | undefined;
    if (req.query.clientId !== undefined) {
      const parsed = Number(req.query.clientId);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        res.status(400).json({ error: "Parâmetro clientId inválido." });
        return;
      }
      clientId = parsed;
    }

    const result = listDeals({ search, stage, clientId, page, pageSize });
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
    const input = parseDealCreateInput(req.body);
    const client = findClientById(input.clientId);
    if (!client) {
      res.status(400).json({ error: "Cliente informado não existe." });
      return;
    }
    const deal = createDeal(input);
    res.status(201).json(deal);
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

    const existing = findDealById(id);
    if (!existing) {
      res.status(404).json({ error: "Negócio não encontrado." });
      return;
    }

    const input = parseDealUpdateInput(req.body);

    if (input.clientId !== undefined) {
      const client = findClientById(input.clientId);
      if (!client) {
        res.status(400).json({ error: "Cliente informado não existe." });
        return;
      }
    }

    const updated = updateDeal(id, input);
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

  const deleted = deleteDeal(id);
  if (!deleted) {
    res.status(404).json({ error: "Negócio não encontrado." });
    return;
  }
  res.status(204).send();
});

export default router;

import { Router, type Request, type Response } from "express";
import { countClients } from "../repositories/clientsRepo.js";
import { countOpenDealsAndPipelineValue } from "../repositories/dealsRepo.js";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const totalClients = countClients();
  const { openDeals, pipelineValueInCents } = countOpenDealsAndPipelineValue();

  res.status(200).json({
    totalClients,
    openDeals,
    pipelineValueInCents
  });
});

export default router;

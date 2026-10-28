import { Router } from "express";
import { requireCronAuth } from "../../middleware/cron-auth.js";
import { asyncHandler } from "../../lib/async-handler.js";
import {
  runAvisosJob,
  runDiarioJob,
  runMensalJob,
} from "../../jobs/cron.js";

export const cronRouter = Router();

cronRouter.use(requireCronAuth);

cronRouter.get(
  "/avisos",
  asyncHandler(async (_req, res) => {
    await runAvisosJob();
    res.json({ ok: true, job: "avisos" });
  }),
);

cronRouter.get(
  "/diario",
  asyncHandler(async (_req, res) => {
    await runDiarioJob();
    res.json({ ok: true, job: "diario" });
  }),
);

cronRouter.get(
  "/mensal",
  asyncHandler(async (_req, res) => {
    await runMensalJob();
    res.json({ ok: true, job: "mensal" });
  }),
);

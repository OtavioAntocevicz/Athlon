import { Router } from "express";
import { requireCronAuth } from "../../middleware/cron-auth.js";
import {
  runAvisosJob,
  runDiarioJob,
  runMensalJob,
} from "../../jobs/cron.js";

export const cronRouter = Router();

cronRouter.use(requireCronAuth);

cronRouter.get("/avisos", async (_req, res, next) => {
  try {
    await runAvisosJob();
    res.json({ ok: true, job: "avisos" });
  } catch (err) {
    next(err);
  }
});

cronRouter.get("/diario", async (_req, res, next) => {
  try {
    await runDiarioJob();
    res.json({ ok: true, job: "diario" });
  } catch (err) {
    next(err);
  }
});

cronRouter.get("/mensal", async (_req, res, next) => {
  try {
    await runMensalJob();
    res.json({ ok: true, job: "mensal" });
  } catch (err) {
    next(err);
  }
});

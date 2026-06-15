import { Router } from "express";
import { authenticate, requireProfessor, requireAluno } from "../../middleware/auth.js";
import * as dashboardService from "./dashboard.service.js";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get("/professor", requireProfessor, async (req, res, next) => {
  try {
    const data = await dashboardService.dashboardProfessor(req.user!.professorId!);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

dashboardRouter.get("/aluno", requireAluno, async (req, res, next) => {
  try {
    const data = await dashboardService.dashboardAluno(req.user!.alunoId!);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

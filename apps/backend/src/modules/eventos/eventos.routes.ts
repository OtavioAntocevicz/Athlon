import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { AppError } from "../../middleware/error-handler.js";
import * as eventosService from "./eventos.service.js";

export const eventosRouter = Router();

eventosRouter.use(authenticate);

eventosRouter.get("/", async (req, res, next) => {
  try {
    if (req.user!.perfil === "ALUNO" && req.user!.alunoId) {
      const data = await eventosService.listarEventosDoAluno(req.user!.alunoId);
      res.json({ data });
      return;
    }
    if (req.user!.professorId) {
      const data = await eventosService.listarEventosDoProfessor(req.user!.professorId);
      res.json({ data });
      return;
    }
    throw new AppError(403, "FORBIDDEN", "Acesso restrito a treinadores ou alunos");
  } catch (e) {
    next(e);
  }
});

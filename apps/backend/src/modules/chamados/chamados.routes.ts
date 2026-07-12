import { Router } from "express";
import { criarChamadoSchema, responderChamadoSchema } from "@athlon/shared-types";
import { validate } from "../../middleware/validate.js";
import { authenticate, requireAdmin } from "../../middleware/auth.js";
import { AppError } from "../../middleware/error-handler.js";
import type { NextFunction, Request, Response } from "express";
import * as chamadosService from "./chamados.service.js";

export const chamadosRouter = Router();
export const adminChamadosRouter = Router();

function requireAlunoOuProfessor(req: Request, _res: Response, next: NextFunction) {
  const perfil = req.user?.perfil;
  if (perfil !== "ALUNO" && perfil !== "PROFESSOR") {
    return next(new AppError(403, "FORBIDDEN", "Acesso restrito a alunos ou treinadores"));
  }
  if (perfil === "ALUNO" && !req.user?.alunoId) {
    return next(new AppError(403, "FORBIDDEN", "Conta de aluno incompleta"));
  }
  if (perfil === "PROFESSOR" && !req.user?.professorId) {
    return next(new AppError(403, "FORBIDDEN", "Conta de treinador incompleta"));
  }
  next();
}

function autorDoUsuario(req: Request) {
  if (req.user!.perfil === "ALUNO") {
    return { alunoId: req.user!.alunoId!, professorId: null };
  }
  return { alunoId: null, professorId: req.user!.professorId! };
}

chamadosRouter.use(authenticate, requireAlunoOuProfessor);

chamadosRouter.get("/", async (req, res, next) => {
  try {
    const data = await chamadosService.listarMeusChamados(autorDoUsuario(req));
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

chamadosRouter.post("/", validate(criarChamadoSchema), async (req, res, next) => {
  try {
    const data = await chamadosService.criarChamado(autorDoUsuario(req), req.body);
    res.status(201).json({ data });
  } catch (e) {
    next(e);
  }
});

chamadosRouter.get("/:id", async (req, res, next) => {
  try {
    const data = await chamadosService.obterMeuChamado(
      String(req.params.id),
      autorDoUsuario(req),
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

adminChamadosRouter.use(authenticate, requireAdmin);

adminChamadosRouter.get("/", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const data = await chamadosService.listarChamadosAdmin(status);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

adminChamadosRouter.get("/:id", async (req, res, next) => {
  try {
    const data = await chamadosService.obterChamadoAdmin(String(req.params.id));
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

adminChamadosRouter.patch(
  "/:id",
  validate(responderChamadoSchema),
  async (req, res, next) => {
    try {
      const data = await chamadosService.responderChamadoAdmin(
        String(req.params.id),
        req.body,
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

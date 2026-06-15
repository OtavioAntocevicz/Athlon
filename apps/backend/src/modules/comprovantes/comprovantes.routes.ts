import { Router } from "express";
import { recusarComprovanteSchema, confirmarComprovanteSchema } from "@athlon/shared-types";
import { authenticate, requireProfessor, requireAluno } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as comprovantesService from "./comprovantes.service.js";
import { criarUploadUrl } from "./storage.service.js";
import rateLimit from "express-rate-limit";

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
});

export const comprovantesRouter = Router();

comprovantesRouter.use(authenticate);

comprovantesRouter.get("/fila", requireProfessor, async (req, res, next) => {
  try {
    const data = await comprovantesService.filaAprovacao(req.user!.professorId!);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

comprovantesRouter.get("/:id", requireProfessor, async (req, res, next) => {
  try {
    const data = await comprovantesService.getComprovante(
      String(req.params.id),
      req.user!.professorId!,
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

comprovantesRouter.post("/:id/aprovar", requireProfessor, async (req, res, next) => {
  try {
    const data = await comprovantesService.aprovarComprovante(
      String(req.params.id),
      req.user!.professorId!,
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

comprovantesRouter.post(
  "/:id/recusar",
  requireProfessor,
  validate(recusarComprovanteSchema),
  async (req, res, next) => {
    try {
      const data = await comprovantesService.recusarComprovante(
        String(req.params.id),
        req.user!.professorId!,
        req.body.motivo,
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

export const mensalidadeComprovanteRouter = Router({ mergeParams: true });

mensalidadeComprovanteRouter.use(authenticate, requireAluno);

mensalidadeComprovanteRouter.post(
  "/upload-url",
  uploadLimiter,
  async (req, res, next) => {
    try {
      const { contentType } = req.body;
      const data = await criarUploadUrl(String(req.params.id), contentType ?? "image/jpeg");
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

mensalidadeComprovanteRouter.post(
  "/",
  uploadLimiter,
  validate(confirmarComprovanteSchema),
  async (req, res, next) => {
    try {
      const data = await comprovantesService.confirmarComprovante(
        String(req.params.id),
        req.user!.alunoId!,
        req.body.arquivoUrl,
      );
      res.status(201).json({ data });
    } catch (e) {
      next(e);
    }
  },
);

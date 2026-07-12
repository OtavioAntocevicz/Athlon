import { Router } from "express";
import { criarChamadoSchema, responderChamadoSchema } from "@athlon/shared-types";
import { validate } from "../../middleware/validate.js";
import { authenticate, requireAdmin, requireAluno } from "../../middleware/auth.js";
import * as chamadosService from "./chamados.service.js";

export const chamadosRouter = Router();
export const adminChamadosRouter = Router();

chamadosRouter.use(authenticate, requireAluno);

chamadosRouter.get("/", async (req, res, next) => {
  try {
    const data = await chamadosService.listarMeusChamados(req.user!.alunoId!);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

chamadosRouter.post("/", validate(criarChamadoSchema), async (req, res, next) => {
  try {
    const data = await chamadosService.criarChamado(req.user!.alunoId!, req.body);
    res.status(201).json({ data });
  } catch (e) {
    next(e);
  }
});

chamadosRouter.get("/:id", async (req, res, next) => {
  try {
    const data = await chamadosService.obterChamadoAluno(
      String(req.params.id),
      req.user!.alunoId!,
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

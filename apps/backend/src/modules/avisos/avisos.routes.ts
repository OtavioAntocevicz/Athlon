import { Router } from "express";
import { criarAvisoSchema } from "@athlon/shared-types";
import { authenticate, requireProfessor } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as avisosService from "./avisos.service.js";

export const avisosRouter = Router();

avisosRouter.use(authenticate, requireProfessor);

avisosRouter.get("/", async (req, res, next) => {
  try {
    const data = await avisosService.listarAvisos(req.user!.professorId!);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

avisosRouter.post("/", validate(criarAvisoSchema), async (req, res, next) => {
  try {
    const data = await avisosService.criarAviso(req.user!.professorId!, req.body);
    res.status(201).json({ data });
  } catch (e) {
    next(e);
  }
});

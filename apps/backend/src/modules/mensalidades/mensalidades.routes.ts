import { Router } from "express";
import { query } from "../../lib/db.js";
import {
  authenticate,
  requireProfessor,
  requireAlunoEmailVerificado,
  requireProfessorOuAluno,
} from "../../middleware/auth.js";
import { AppError } from "../../middleware/error-handler.js";
import * as mensalidadesService from "./mensalidades.service.js";
import type { StatusMensalidade } from "@athlon/shared-types";

export const mensalidadesRouter = Router();

mensalidadesRouter.use(authenticate, requireProfessorOuAluno);

mensalidadesRouter.get("/", requireAlunoEmailVerificado, async (req, res, next) => {
  try {
    const status = req.query.status as StatusMensalidade | undefined;
    const turmaId = req.query.turmaId as string | undefined;

    const data = await mensalidadesService.listarMensalidades({
      professorId: req.user!.perfil === "PROFESSOR" ? req.user!.professorId : undefined,
      alunoId: req.user!.perfil === "ALUNO" ? req.user!.alunoId : undefined,
      turmaId,
      status,
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

mensalidadesRouter.get("/:id", requireAlunoEmailVerificado, async (req, res, next) => {
  try {
    const data = await mensalidadesService.getMensalidade(String(req.params.id), req.user!);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

mensalidadesRouter.post("/:id/marcar-pago", requireProfessor, async (req, res, next) => {
  try {
    const data = await mensalidadesService.marcarPagoManual(
      String(req.params.id),
      req.user!.professorId!,
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

mensalidadesRouter.post("/gerar", requireProfessor, async (req, res, next) => {
  try {
    const { turmaId } = req.body;
    if (turmaId) {
      const turma = await query<{ id: string }>(
        `SELECT id FROM "Turma" WHERE id = $1 AND professor_id = $2`,
        [turmaId, req.user!.professorId!],
      );

      if (turma.length === 0) {
        throw new AppError(403, "FORBIDDEN", "Turma não encontrada");
      }

      await mensalidadesService.gerarMensalidadesParaTurma(turmaId);
    } else {
      const turmas = await query<{ id: string }>(
        `SELECT id FROM "Turma" WHERE professor_id = $1`,
        [req.user!.professorId!],
      );

      for (const t of turmas) {
        await mensalidadesService.gerarMensalidadesParaTurma(t.id);
      }
    }
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
});

import { Router } from "express";
import { supabase } from "../../config/supabase.js";
import { authenticate, requireProfessor } from "../../middleware/auth.js";
import * as mensalidadesService from "./mensalidades.service.js";
import type { StatusMensalidade } from "@athlon/shared-types";

export const mensalidadesRouter = Router();

mensalidadesRouter.use(authenticate);

mensalidadesRouter.get("/", async (req, res, next) => {
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

mensalidadesRouter.get("/:id", async (req, res, next) => {
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
      await mensalidadesService.gerarMensalidadesParaTurma(turmaId);
    } else {
      const { data: turmas } = await supabase
        .from("Turma")
        .select("id")
        .eq("professor_id", req.user!.professorId!);

      for (const t of turmas ?? []) {
        await mensalidadesService.gerarMensalidadesParaTurma(t.id);
      }
    }
    res.json({ data: { ok: true } });
  } catch (e) {
    next(e);
  }
});

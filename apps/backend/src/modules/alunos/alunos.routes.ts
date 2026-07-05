import { Router } from "express";
import {
  afastarTurmaSchema,
  entrarTurmaSchema,
  updateAlunoSchema,
  updateMatriculaSchema,
} from "@athlon/shared-types";
import { authenticate, requireAluno, requireProfessor } from "../../middleware/auth.js";
import {
  alunoTemBloqueioAtivo,
  requireAlunoSemBloqueio,
} from "../../middleware/inadimplencia-guard.js";
import { listarBloqueiosAluno } from "../../lib/inadimplencia.js";
import { validate } from "../../middleware/validate.js";
import * as alunosService from "./alunos.service.js";
import * as eventosService from "../eventos/eventos.service.js";

export const alunosRouter = Router();

alunosRouter.use(authenticate);

alunosRouter.get("/", async (req, res, next) => {
  try {
    if (req.user!.perfil === "PROFESSOR") {
      const data = await alunosService.listarAlunos(req.user!.professorId!);
      return res.json({ data });
    }
    const data = await alunosService.getAluno(req.user!.alunoId!, req.user!);
    res.json({ data: [data] });
  } catch (e) {
    next(e);
  }
});

alunosRouter.get("/me/bloqueio", requireAluno, async (req, res, next) => {
  try {
    const alunoId = req.user!.alunoId!;
    const bloqueado = await alunoTemBloqueioAtivo(alunoId);
    const bloqueios = bloqueado ? await listarBloqueiosAluno(alunoId) : [];
    res.json({ data: { bloqueado, bloqueios } });
  } catch (e) {
    next(e);
  }
});

alunosRouter.get("/minhas-turmas", requireAluno, requireAlunoSemBloqueio, async (req, res, next) => {
  try {
    const data = await alunosService.listarMinhasTurmas(req.user!.alunoId!);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

alunosRouter.get("/minhas-turmas/:turmaId", requireAluno, requireAlunoSemBloqueio, async (req, res, next) => {
  try {
    const data = await alunosService.getMinhaTurma(
      req.user!.alunoId!,
      String(req.params.turmaId),
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

alunosRouter.get(
  "/minhas-turmas/:turmaId/eventos",
  requireAluno,
  requireAlunoSemBloqueio,
  async (req, res, next) => {
    try {
      const data = await eventosService.proximosEventosDaTurmaAluno(
        req.user!.alunoId!,
        String(req.params.turmaId),
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

alunosRouter.patch(
  "/minhas-turmas/:turmaId",
  requireAluno,
  requireAlunoSemBloqueio,
  validate(updateMatriculaSchema),
  async (req, res, next) => {
    try {
      const data = await alunosService.atualizarMatricula(
        req.user!.alunoId!,
        String(req.params.turmaId),
        req.body,
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

alunosRouter.get("/:id", async (req, res, next) => {
  try {
    const data = await alunosService.getAluno(String(req.params.id), req.user!);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

alunosRouter.patch("/:id", validate(updateAlunoSchema), async (req, res, next) => {
  try {
    const data = await alunosService.atualizarAluno(String(req.params.id), req.user!, req.body);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

alunosRouter.post(
  "/preview-turma",
  requireAluno,
  requireAlunoSemBloqueio,
  validate(entrarTurmaSchema),
  async (req, res, next) => {
    try {
      const data = await alunosService.previewTurmaPorCodigo(
        req.user!.alunoId!,
        req.body.codigoConvite,
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

alunosRouter.post(
  "/entrar-turma",
  requireAluno,
  requireAlunoSemBloqueio,
  validate(entrarTurmaSchema),
  async (req, res, next) => {
    try {
      const data = await alunosService.entrarTurma(
        req.user!.alunoId!,
        req.body.codigoConvite,
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

alunosRouter.post(
  "/:id/desbloquear-inadimplencia",
  requireProfessor,
  validate(afastarTurmaSchema),
  async (req, res, next) => {
    try {
      const data = await alunosService.desbloquearInadimplenciaAluno(
        String(req.params.id),
        req.body.turmaId,
        req.user!.professorId!,
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

alunosRouter.post(
  "/:id/afastar-turma",
  requireProfessor,
  validate(afastarTurmaSchema),
  async (req, res, next) => {
    try {
      const data = await alunosService.afastarAlunoTurma(
        String(req.params.id),
        req.body.turmaId,
        req.user!.professorId!,
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

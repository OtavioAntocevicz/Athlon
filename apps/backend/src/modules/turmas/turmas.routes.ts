import { Router } from "express";
import {
  createAlunoSchema,
  createTurmaSchema,
  criarEventoSchema,
  atualizarEventoSchema,
  atualizarFotoTurmaSchema,
  updateTurmaBasicoSchema,
  updateTurmaSchema,
} from "@athlon/shared-types";
import { authenticate, requireProfessor } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as turmasService from "./turmas.service.js";
import * as alunosService from "../alunos/alunos.service.js";
import * as mensalidadesService from "../mensalidades/mensalidades.service.js";
import * as eventosService from "../eventos/eventos.service.js";

export const turmasRouter = Router();

turmasRouter.use(authenticate, requireProfessor);

turmasRouter.get("/", async (req, res, next) => {
  try {
    const data = await turmasService.listarTurmas(req.user!.professorId!);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

turmasRouter.post("/", validate(createTurmaSchema), async (req, res, next) => {
  try {
    const data = await turmasService.criarTurma(req.user!.professorId!, req.body);
    res.status(201).json({ data });
  } catch (e) {
    next(e);
  }
});

turmasRouter.get("/:id", async (req, res, next) => {
  try {
    const data = await turmasService.getTurma(String(req.params.id), req.user!.professorId!);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

turmasRouter.patch("/:id", validate(updateTurmaSchema), async (req, res, next) => {
  try {
    const data = await turmasService.atualizarTurma(
      String(req.params.id),
      req.user!.professorId!,
      req.body,
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

turmasRouter.patch("/:id/basico", validate(updateTurmaBasicoSchema), async (req, res, next) => {
  try {
    const data = await turmasService.atualizarTurmaBasico(
      String(req.params.id),
      req.user!.professorId!,
      req.body,
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

turmasRouter.post("/:id/foto/upload-url", async (req, res, next) => {
  try {
    const contentType = (req.body?.contentType as string | undefined) ?? "image/jpeg";
    const data = await turmasService.criarUploadUrlFoto(
      String(req.params.id),
      req.user!.professorId!,
      contentType,
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

turmasRouter.patch("/:id/foto", validate(atualizarFotoTurmaSchema), async (req, res, next) => {
  try {
    const data = await turmasService.atualizarFotoTurma(
      String(req.params.id),
      req.user!.professorId!,
      req.body.fotoUrl,
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

turmasRouter.get("/:id/alunos", async (req, res, next) => {
  try {
    const data = await turmasService.listarAlunosTurma(
      String(req.params.id),
      req.user!.professorId!,
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

turmasRouter.post("/:id/alunos", validate(createAlunoSchema), async (req, res, next) => {
  try {
    const data = await alunosService.adicionarAlunoTurma(
      String(req.params.id),
      req.user!.professorId!,
      req.body,
    );
    res.status(201).json({ data });
  } catch (e) {
    next(e);
  }
});

turmasRouter.delete("/:id", async (req, res, next) => {
  try {
    const data = await turmasService.excluirTurma(
      String(req.params.id),
      req.user!.professorId!,
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

turmasRouter.get("/:id/mensalidades", async (req, res, next) => {
  try {
    const data = await mensalidadesService.listarMensalidades({
      professorId: req.user!.professorId!,
      turmaId: String(req.params.id),
    });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

turmasRouter.get("/:id/eventos", async (req, res, next) => {
  try {
    const data = await eventosService.listarEventosDaTurma(
      String(req.params.id),
      req.user!.professorId!,
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

turmasRouter.post("/:id/eventos", validate(criarEventoSchema), async (req, res, next) => {
  try {
    const data = await eventosService.criarEvento(
      req.user!.professorId!,
      String(req.params.id),
      req.body,
    );
    res.status(201).json({ data });
  } catch (e) {
    next(e);
  }
});

turmasRouter.patch(
  "/:id/eventos/:eventoId",
  validate(atualizarEventoSchema),
  async (req, res, next) => {
    try {
      const data = await eventosService.atualizarEvento(
        req.user!.professorId!,
        String(req.params.id),
        String(req.params.eventoId),
        req.body,
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

turmasRouter.delete("/:id/eventos/:eventoId", async (req, res, next) => {
  try {
    const data = await eventosService.excluirEvento(
      req.user!.professorId!,
      String(req.params.id),
      String(req.params.eventoId),
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

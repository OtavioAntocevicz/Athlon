import { Router } from "express";
import {
  createProfessorAdminSchema,
  updateProfessorStatusSchema,
  adminMatricularSchema,
  adminAfastarSchema,
  adminTrocarTurmaSchema,
  adminDesbloquearSchema,
} from "@athlon/shared-types";
import { validate } from "../../middleware/validate.js";
import { authenticate, requireAdmin, requireAdminMfa } from "../../middleware/auth.js";
import {
  AcoesAuditoria,
  auditoriaFromRequest,
  listarAuditoriaAdmin,
  registrarAuditoriaAdmin,
} from "../../lib/auditoria.js";
import * as adminService from "./admin.service.js";

export const adminRouter = Router();

adminRouter.use(authenticate, requireAdmin, requireAdminMfa);

adminRouter.get("/dashboard", async (req, res, next) => {
  try {
    const busca = typeof req.query.busca === "string" ? req.query.busca : undefined;
    const ativoParam = req.query.ativo;
    let ativo: boolean | undefined;
    if (ativoParam === "true") ativo = true;
    if (ativoParam === "false") ativo = false;

    const data = await adminService.getDashboard();
    if (busca || ativo !== undefined) {
      data.professores = await adminService.listarProfessores({ busca, ativo });
    }
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/professores", async (req, res, next) => {
  try {
    const busca = typeof req.query.busca === "string" ? req.query.busca : undefined;
    const ativoParam = req.query.ativo;
    let ativo: boolean | undefined;
    if (ativoParam === "true") ativo = true;
    if (ativoParam === "false") ativo = false;

    const data = await adminService.listarProfessores({ busca, ativo });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

adminRouter.post(
  "/professores",
  validate(createProfessorAdminSchema),
  async (req, res, next) => {
    try {
      const data = await adminService.criarProfessor(req.body);
      await registrarAuditoriaAdmin(
        auditoriaFromRequest(req),
        AcoesAuditoria.CRIAR_PROFESSOR,
        "professor",
        data.id,
        { email: data.email, nome: data.nome },
      );
      res.status(201).json({ data });
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.post("/professores/:id/reenviar-convite", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const data = await adminService.reenviarConviteProfessor(id);
    await registrarAuditoriaAdmin(
      auditoriaFromRequest(req),
      AcoesAuditoria.REENVIAR_CONVITE_PROFESSOR,
      "professor",
      id,
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/professores/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const data = await adminService.obterProfessor(id);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

adminRouter.patch(
  "/professores/:id/status",
  validate(updateProfessorStatusSchema),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const data = await adminService.atualizarStatusProfessor(id, req.body);
      await registrarAuditoriaAdmin(
        auditoriaFromRequest(req),
        AcoesAuditoria.ATUALIZAR_STATUS_PROFESSOR,
        "professor",
        id,
        { ativo: req.body.ativo },
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.delete("/professores/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const data = await adminService.excluirProfessorAdmin(id);
    await registrarAuditoriaAdmin(
      auditoriaFromRequest(req),
      AcoesAuditoria.EXCLUIR_PROFESSOR,
      "professor",
      id,
      { nome: data.nome, turmasExcluidas: data.turmasExcluidas },
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/professores/:id/turmas", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const prof = await adminService.obterProfessor(id);
    res.json({ data: prof.turmas });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/professores/:id/alunos", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const prof = await adminService.obterProfessor(id);
    const turmaId = typeof req.query.turmaId === "string" ? req.query.turmaId : undefined;
    const alunos = turmaId
      ? prof.alunos.filter((a) => a.turmas.some((t) => t.id === turmaId))
      : prof.alunos;
    res.json({ data: alunos });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/turmas", async (req, res, next) => {
  try {
    const busca = typeof req.query.busca === "string" ? req.query.busca : undefined;
    const data = await adminService.listarTurmasAdmin(busca);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/turmas/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const data = await adminService.obterTurmaAdmin(id);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/bloqueios", async (req, res, next) => {
  try {
    const data = await adminService.listarBloqueiosAdmin();
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/alunos", async (req, res, next) => {
  try {
    const busca = typeof req.query.busca === "string" ? req.query.busca : undefined;
    const semTurma = req.query.semTurma === "true";
    const data = await adminService.listarAlunosAdmin({ busca, semTurma });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/alunos/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const data = await adminService.obterAlunoAdmin(id);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

adminRouter.post(
  "/alunos/:id/matricular",
  validate(adminMatricularSchema),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const data = await adminService.matricularAlunoAdmin(id, req.body.turmaId);
      await registrarAuditoriaAdmin(
        auditoriaFromRequest(req),
        AcoesAuditoria.MATRICULAR_ALUNO,
        "aluno",
        id,
        { turmaId: req.body.turmaId },
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.post(
  "/alunos/:id/afastar",
  validate(adminAfastarSchema),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const data = await adminService.afastarAlunoAdmin(id, req.body.turmaId);
      await registrarAuditoriaAdmin(
        auditoriaFromRequest(req),
        AcoesAuditoria.AFASTAR_ALUNO,
        "aluno",
        id,
        { turmaId: req.body.turmaId },
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.post(
  "/alunos/:id/trocar-turma",
  validate(adminTrocarTurmaSchema),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const data = await adminService.trocarTurmaAdmin(
        id,
        req.body.turmaOrigemId,
        req.body.turmaDestinoId,
      );
      await registrarAuditoriaAdmin(
        auditoriaFromRequest(req),
        AcoesAuditoria.TROCAR_TURMA,
        "aluno",
        id,
        {
          turmaOrigemId: req.body.turmaOrigemId,
          turmaDestinoId: req.body.turmaDestinoId,
        },
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.post(
  "/alunos/:id/desbloquear",
  validate(adminDesbloquearSchema),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const data = await adminService.desbloquearAlunoAdmin(id, req.body.turmaId);
      await registrarAuditoriaAdmin(
        auditoriaFromRequest(req),
        AcoesAuditoria.DESBLOQUEAR_ALUNO,
        "aluno",
        id,
        { turmaId: req.body.turmaId },
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

adminRouter.delete("/alunos/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const data = await adminService.excluirAlunoAdmin(id);
    await registrarAuditoriaAdmin(
      auditoriaFromRequest(req),
      AcoesAuditoria.EXCLUIR_ALUNO,
      "aluno",
      id,
      { nome: data.nome },
    );
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

adminRouter.get("/auditoria", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "30"), 10) || 30));
    const acao = typeof req.query.acao === "string" ? req.query.acao : undefined;
    const data = await listarAuditoriaAdmin({ page, limit, acao });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

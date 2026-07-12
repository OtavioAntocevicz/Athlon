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
import { authenticate, requireAdmin } from "../../middleware/auth.js";
import * as adminService from "./admin.service.js";

export const adminRouter = Router();

adminRouter.use(authenticate, requireAdmin);

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
      res.status(201).json({ data });
    } catch (e) {
      next(e);
    }
  },
);

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
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

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
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

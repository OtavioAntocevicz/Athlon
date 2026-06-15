import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  loginSchema,
  registerProfessorSchema,
  registerAlunoSchema,
  updateProfessorPerfilSchema,
  updateAlunoPerfilSchema,
  changePasswordSchema,
} from "@athlon/shared-types";
import { validate } from "../../middleware/validate.js";
import { authenticate } from "../../middleware/auth.js";
import { AppError } from "../../middleware/error-handler.js";
import * as authService from "./auth.service.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: { code: "RATE_LIMIT", message: "Muitas tentativas" } },
});

export const authRouter = Router();

authRouter.post(
  "/register/professor",
  loginLimiter,
  validate(registerProfessorSchema),
  async (req, res, next) => {
    try {
      const data = await authService.registerProfessor(req.body);
      res.status(201).json({ data });
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post(
  "/register/aluno",
  loginLimiter,
  validate(registerAlunoSchema),
  async (req, res, next) => {
    try {
      const data = await authService.registerAluno(req.body);
      res.status(201).json({ data });
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post("/login", loginLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const data = await authService.login(req.body);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

authRouter.get("/me", authenticate, async (req, res, next) => {
  try {
    const data = await authService.getMe(req.user!.sub);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

authRouter.patch(
  "/me",
  authenticate,
  (req, res, next) => {
    const schema =
      req.user!.perfil === "PROFESSOR"
        ? updateProfessorPerfilSchema
        : updateAlunoPerfilSchema;
    validate(schema)(req, res, next);
  },
  async (req, res, next) => {
    try {
      if (req.user!.perfil === "PROFESSOR") {
        const data = await authService.updateProfessorPerfil(
          req.user!.sub,
          req.user!.professorId!,
          req.body,
        );
        return res.json({ data });
      }
      if (req.user!.perfil === "ALUNO") {
        const data = await authService.updateAlunoPerfil(
          req.user!.sub,
          req.user!.alunoId!,
          req.body,
        );
        return res.json({ data });
      }
      throw new AppError(400, "INVALID_PERFIL", "Perfil não suportado");
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post(
  "/me/senha",
  authenticate,
  validate(changePasswordSchema),
  async (req, res, next) => {
    try {
      const data = await authService.alterarSenha(req.user!.sub, req.body);
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        error: { code: "MISSING_TOKEN", message: "Refresh token obrigatório" },
      });
    }
    const data = await authService.refreshToken(refreshToken);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

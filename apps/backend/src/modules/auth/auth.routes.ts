import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  loginSchema,
  registerAlunoSchema,
  updateProfessorPerfilSchema,
  updateAlunoPerfilSchema,
  changePasswordSchema,
  requestPasswordResetSchema,
  confirmPasswordResetSchema,
  confirmEmailVerificationSchema,
  confirmMfaSchema,
  disableMfaSchema,
  loginMfaSchema,
} from "@athlon/shared-types";
import { validate } from "../../middleware/validate.js";
import { authenticate, requireAdmin } from "../../middleware/auth.js";
import { refreshTokenLimiter } from "../../middleware/rate-limit.js";
import { AppError } from "../../middleware/error-handler.js";
import {
  clearAuthCookies,
  clearMfaPendingCookie,
  getMfaPendingFromRequest,
  getRefreshTokenFromRequest,
  setMfaPendingCookie,
} from "../../lib/auth-cookies.js";
import { signMfaPendingToken, verifyMfaPendingToken } from "../../lib/jwt.js";
import { AcoesAuditoria, auditoriaFromRequest, registrarAuditoriaAdmin } from "../../lib/auditoria.js";
import { sendAuthResponse } from "./auth-response.js";
import * as authService from "./auth.service.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: { code: "RATE_LIMIT", message: "Muitas tentativas" } },
});

export const authRouter = Router();

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
    if ("requiresMfa" in data && data.requiresMfa) {
      const token = signMfaPendingToken(data.usuarioId);
      setMfaPendingCookie(res, token);
      return res.json({ data: { requiresMfa: true } });
    }
    sendAuthResponse(res, data as Parameters<typeof sendAuthResponse>[1]);
  } catch (e) {
    next(e);
  }
});

authRouter.post("/login/mfa", loginLimiter, validate(loginMfaSchema), async (req, res, next) => {
  try {
    const pending = getMfaPendingFromRequest(req);
    if (!pending) {
      throw new AppError(401, "MFA_SESSION_EXPIRED", "Sessão MFA expirada. Faça login novamente.");
    }

    let usuarioId: string;
    try {
      usuarioId = verifyMfaPendingToken(pending).sub;
    } catch {
      throw new AppError(401, "MFA_SESSION_EXPIRED", "Sessão MFA expirada. Faça login novamente.");
    }

    const data = await authService.loginMfa(usuarioId, req.body.codigo);
    clearMfaPendingCookie(res);
    sendAuthResponse(res, data);
  } catch (e) {
    next(e);
  }
});

authRouter.get("/mfa/status", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const data = await authService.getMfaStatus(req.user!.sub);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

authRouter.post("/mfa/setup", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const data = await authService.iniciarMfaSetup(req.user!.sub, req.user!.email);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

authRouter.post(
  "/mfa/confirm",
  authenticate,
  requireAdmin,
  validate(confirmMfaSchema),
  async (req, res, next) => {
    try {
      const data = await authService.confirmarMfaSetup(req.user!.sub, req.body.codigo);
      await registrarAuditoriaAdmin(
        auditoriaFromRequest(req),
        AcoesAuditoria.MFA_HABILITAR,
        "usuario",
        req.user!.sub,
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post(
  "/mfa/backup-codes",
  authenticate,
  requireAdmin,
  loginLimiter,
  validate(confirmMfaSchema),
  async (req, res, next) => {
    try {
      const data = await authService.regenerarBackupCodes(req.user!.sub, req.body.codigo);
      await registrarAuditoriaAdmin(
        auditoriaFromRequest(req),
        AcoesAuditoria.MFA_BACKUP_CODES_REGENERAR,
        "usuario",
        req.user!.sub,
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post(
  "/mfa/disable",
  authenticate,
  requireAdmin,
  validate(disableMfaSchema),
  async (req, res, next) => {
    try {
      const data = await authService.desabilitarMfaAdmin(
        req.user!.sub,
        req.body.senha,
        req.body.codigo,
      );
      await registrarAuditoriaAdmin(
        auditoriaFromRequest(req),
        AcoesAuditoria.MFA_DESABILITAR,
        "usuario",
        req.user!.sub,
      );
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post(
  "/recuperar-senha/solicitar",
  loginLimiter,
  validate(requestPasswordResetSchema),
  async (req, res, next) => {
    try {
      const data = await authService.solicitarRecuperacaoSenha(req.body);
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post(
  "/recuperar-senha/confirmar",
  loginLimiter,
  validate(confirmPasswordResetSchema),
  async (req, res, next) => {
    try {
      const data = await authService.confirmarRecuperacaoSenha(req.body);
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post("/logout", async (req, res, next) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    const data = await authService.logout(refreshToken);
    clearAuthCookies(res);
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
      sendAuthResponse(res, data);
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post("/refresh", refreshTokenLimiter, async (req, res, next) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      return res.status(400).json({
        error: { code: "MISSING_TOKEN", message: "Sessão não encontrada" },
      });
    }
    const data = await authService.refreshToken(refreshToken);
    sendAuthResponse(res, data);
  } catch (e) {
    next(e);
  }
});

authRouter.post(
  "/verificar-email/confirmar",
  authenticate,
  loginLimiter,
  validate(confirmEmailVerificationSchema),
  async (req, res, next) => {
    try {
      const data = await authService.confirmarVerificacaoEmail(req.user!.sub, req.body);
      sendAuthResponse(res, data);
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post(
  "/verificar-email/reenviar",
  authenticate,
  loginLimiter,
  async (req, res, next) => {
    try {
      const data = await authService.reenviarVerificacaoEmail(req.user!.sub);
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { getAccessTokenFromRequest } from "../lib/auth-cookies.js";
import { AppError } from "./error-handler.js";
import type { PerfilUsuario } from "@athlon/shared-types";

export interface JwtPayload {
  sub: string;
  email: string;
  nome: string;
  perfil: PerfilUsuario;
  professorId?: string;
  alunoId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = getAccessTokenFromRequest(req);
  if (!token) {
    return next(new AppError(401, "UNAUTHORIZED", "Token não informado"));
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret) as JwtPayload;
    next();
  } catch {
    next(new AppError(401, "INVALID_TOKEN", "Token inválido ou expirado"));
  }
}

export function requireProfessor(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.perfil !== "PROFESSOR") {
    return next(new AppError(403, "FORBIDDEN", "Acesso restrito a treinadores"));
  }
  next();
}

export async function requireAluno(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.perfil !== "ALUNO" || !req.user.alunoId) {
    return next(new AppError(403, "FORBIDDEN", "Acesso restrito a alunos"));
  }
  next();
}

export async function requireAlunoEmailVerificado(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (req.user?.perfil !== "ALUNO") return next();

  const { queryMaybeOne } = await import("../lib/db.js");
  const usuario = await queryMaybeOne<{ email_verificado_em: string | null }>(
    `SELECT email_verificado_em FROM "Usuario" WHERE id = $1`,
    [req.user.sub],
  );

  if (!usuario?.email_verificado_em) {
    return next(
      new AppError(
        403,
        "EMAIL_NAO_VERIFICADO",
        "Confirme seu e-mail antes de continuar.",
      ),
    );
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.perfil !== "ADM") {
    return next(new AppError(403, "FORBIDDEN", "Acesso restrito a administradores"));
  }
  next();
}

/** Bloqueia rotas administrativas até o MFA estar ativo. Setup em /auth/mfa/* continua liberado. */
export async function requireAdminMfa(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.perfil !== "ADM") {
    return next(new AppError(403, "FORBIDDEN", "Acesso restrito a administradores"));
  }

  const { queryMaybeOne } = await import("../lib/db.js");
  const usuario = await queryMaybeOne<{ mfa_habilitado_em: string | null }>(
    `SELECT mfa_habilitado_em FROM "Usuario" WHERE id = $1`,
    [req.user.sub],
  );

  if (!usuario?.mfa_habilitado_em) {
    return next(
      new AppError(
        403,
        "MFA_OBRIGATORIO",
        "Ative a autenticação em duas etapas no perfil para usar o painel.",
      ),
    );
  }
  next();
}

export function requireProfessorOuAluno(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.perfil !== "PROFESSOR" && req.user?.perfil !== "ALUNO") {
    return next(new AppError(403, "FORBIDDEN", "Acesso negado"));
  }
  next();
}

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
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
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError(401, "UNAUTHORIZED", "Token não informado"));
  }

  try {
    const token = header.slice(7);
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

export function requireProfessorOuAluno(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.perfil !== "PROFESSOR" && req.user?.perfil !== "ALUNO") {
    return next(new AppError(403, "FORBIDDEN", "Acesso negado"));
  }
  next();
}

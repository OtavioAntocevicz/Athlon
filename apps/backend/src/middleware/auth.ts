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

export function requireAluno(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.perfil !== "ALUNO") {
    return next(new AppError(403, "FORBIDDEN", "Acesso restrito a alunos"));
  }
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.perfil !== "ADM") {
    return next(new AppError(403, "FORBIDDEN", "Acesso restrito a administradores"));
  }
  next();
}

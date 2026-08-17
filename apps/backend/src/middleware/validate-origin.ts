import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { AppError } from "./error-handler.js";
import { getAccessTokenFromRequest } from "../lib/auth-cookies.js";

/** Mitiga CSRF quando a autenticação usa cookies cross-site. */
export function validateOrigin(req: Request, _res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const origin = req.headers.origin;
  if (!origin) {
    if (getAccessTokenFromRequest(req) && !req.cookies?.athlon_access) {
      return next();
    }
    if (!req.cookies?.athlon_access && !req.cookies?.athlon_refresh) {
      return next();
    }
    return next(new AppError(403, "FORBIDDEN", "Origem não permitida"));
  }

  const normalized = origin.replace(/\/$/, "");
  if (env.corsOrigins.includes(normalized)) return next();

  return next(new AppError(403, "FORBIDDEN", "Origem não permitida"));
}

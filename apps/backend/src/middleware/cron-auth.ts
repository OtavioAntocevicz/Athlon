import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

export function requireCronAuth(req: Request, res: Response, next: NextFunction) {
  if (!env.cronSecret) {
    next();
    return;
  }

  const auth = req.headers.authorization;
  if (auth !== `Bearer ${env.cronSecret}`) {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Acesso negado" },
    });
    return;
  }

  next();
}

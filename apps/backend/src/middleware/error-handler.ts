import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: err.errors.map((e) => e.message).join(", "),
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
  }

  const message = err.message ?? "";

  if (
    message.includes("fetch failed") ||
    message.includes("ENOTFOUND") ||
    message.includes("ECONNREFUSED") ||
    message.includes("Missing env: DATABASE_URL") ||
    message.includes("connect ECONNREFUSED") ||
    message.includes("password authentication failed")
  ) {
    console.error(err);
    return res.status(503).json({
      error: {
        code: "DATABASE_UNAVAILABLE",
        message:
          "Não foi possível conectar ao banco de dados. Verifique DATABASE_URL no ambiente.",
      },
    });
  }

  console.error(err);
  return res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" },
  });
}

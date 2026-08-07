import type { Request, Response, NextFunction } from "express";
import { countQuery } from "../lib/db.js";
import { AppError } from "./error-handler.js";

export async function alunoTemBloqueioAtivo(alunoId: string): Promise<boolean> {
  const count = await countQuery(
    `SELECT COUNT(*)::text AS count FROM "MatriculaTurma"
     WHERE aluno_id = $1 AND afastado = false AND bloqueado_inadimplencia = true`,
    [alunoId],
  );

  return count > 0;
}

export async function requireAlunoSemBloqueio(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (req.user?.perfil !== "ALUNO" || !req.user.alunoId) {
    return next();
  }

  const bloqueado = await alunoTemBloqueioAtivo(req.user.alunoId);
  if (bloqueado) {
    return next(
      new AppError(
        403,
        "INADIMPLENTE_BLOQUEADO",
        "Você está bloqueado por inadimplência. Regularize suas mensalidades em atraso.",
      ),
    );
  }

  next();
}

import type { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase.js";
import { AppError } from "./error-handler.js";

export async function alunoTemBloqueioAtivo(alunoId: string): Promise<boolean> {
  const { count } = await supabase
    .from("MatriculaTurma")
    .select("*", { count: "exact", head: true })
    .eq("aluno_id", alunoId)
    .eq("afastado", false)
    .eq("bloqueado_inadimplencia", true);

  return (count ?? 0) > 0;
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

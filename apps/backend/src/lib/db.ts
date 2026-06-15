import type { PostgrestError } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { supabase } from "../config/supabase.js";
import { AppError } from "../middleware/error-handler.js";

export function generateId(): string {
  return nanoid();
}

export function now(): string {
  return new Date().toISOString();
}

export function throwOnError<T>(
  result: { data: T | null; error: PostgrestError | null },
  notFound?: { code?: string; message: string },
): T {
  if (result.error) {
    if (result.error.code === "23505") {
      throw new AppError(409, "CONFLICT", "Registro já existe");
    }
    if (result.error.code === "PGRST116" && notFound) {
      throw new AppError(404, notFound.code ?? "NOT_FOUND", notFound.message);
    }
    throw new AppError(500, "DB_ERROR", result.error.message);
  }
  if (result.data === null && notFound) {
    throw new AppError(404, notFound.code ?? "NOT_FOUND", notFound.message);
  }
  return result.data as T;
}

export async function turmaIdsDoProfessor(professorId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("Turma")
    .select("id")
    .eq("professor_id", professorId);
  if (error) throw new AppError(500, "DB_ERROR", error.message);
  return (data ?? []).map((t) => t.id);
}

export async function matricularAlunoTurma(alunoId: string, turmaId: string) {
  const existing = await supabase
    .from("MatriculaTurma")
    .select("id")
    .eq("aluno_id", alunoId)
    .eq("turma_id", turmaId)
    .maybeSingle();

  if (existing.data) {
    const { error } = await supabase
      .from("MatriculaTurma")
      .update({ afastado: false })
      .eq("id", existing.data.id);
    if (error) throw new AppError(500, "DB_ERROR", error.message);
    return;
  }

  const { error } = await supabase.from("MatriculaTurma").insert({
    id: generateId(),
    aluno_id: alunoId,
    turma_id: turmaId,
    matriculado_em: now(),
    afastado: false,
  });
  if (error) throw new AppError(500, "DB_ERROR", error.message);
}

export function sumCentavos(rows: { valor_centavos: number }[]): number {
  return rows.reduce((acc, r) => acc + r.valor_centavos, 0);
}

/** PostgREST pode retornar relação 1:1 como objeto ou array. */
export function relOne<T>(rel: T | T[] | null | undefined): T | undefined {
  if (!rel) return undefined;
  return Array.isArray(rel) ? rel[0] : rel;
}

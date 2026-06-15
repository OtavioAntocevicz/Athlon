import { supabase } from "../config/supabase.js";
import { throwOnError } from "./db.js";
import { AppError } from "../middleware/error-handler.js";
import { statusEfetivo } from "./mensalidade-focus.js";
import { isMesFuturo } from "./utils.js";

const MESES_PARA_BLOQUEIO = 2;

export function contarAtrasadasPorTurma(
  pagamentos: { status: string; mes_referencia: string; vencimento: string | null }[],
  turmaId: string,
  hoje: Date,
): number {
  return pagamentos.filter((p) => {
    if (isMesFuturo(p.mes_referencia, hoje)) return false;
    return statusEfetivo(p, hoje) === "ATRASADO";
  }).length;
}

export async function sincronizarBloqueiosInadimplencia() {
  const matriculasResult = await supabase
    .from("MatriculaTurma")
    .select("id, aluno_id, turma_id, bloqueado_inadimplencia")
    .eq("afastado", false);

  const matriculas = throwOnError(matriculasResult);
  const hoje = new Date();

  for (const m of matriculas) {
    const pagResult = await supabase
      .from("Pagamento")
      .select("status, mes_referencia, vencimento")
      .eq("aluno_id", m.aluno_id)
      .eq("turma_id", m.turma_id);

    const pagamentos = pagResult.data ?? [];
    const atrasadas = contarAtrasadasPorTurma(pagamentos, m.turma_id, hoje);
    const deveBloquear = atrasadas >= MESES_PARA_BLOQUEIO;

    if (deveBloquear !== m.bloqueado_inadimplencia) {
      await supabase
        .from("MatriculaTurma")
        .update({ bloqueado_inadimplencia: deveBloquear })
        .eq("id", m.id);
    }
  }
}

export async function sincronizarBloqueioAluno(alunoId: string) {
  const matriculasResult = await supabase
    .from("MatriculaTurma")
    .select("id, aluno_id, turma_id, bloqueado_inadimplencia")
    .eq("aluno_id", alunoId)
    .eq("afastado", false);

  const matriculas = throwOnError(matriculasResult);
  const hoje = new Date();

  for (const m of matriculas) {
    const pagResult = await supabase
      .from("Pagamento")
      .select("status, mes_referencia, vencimento")
      .eq("aluno_id", m.aluno_id)
      .eq("turma_id", m.turma_id);

    const atrasadas = contarAtrasadasPorTurma(pagResult.data ?? [], m.turma_id, hoje);
    const deveBloquear = atrasadas >= MESES_PARA_BLOQUEIO;

    if (deveBloquear !== m.bloqueado_inadimplencia) {
      await supabase
        .from("MatriculaTurma")
        .update({ bloqueado_inadimplencia: deveBloquear })
        .eq("id", m.id);
    }
  }
}

export async function listarBloqueiosAluno(alunoId: string) {
  const result = await supabase
    .from("MatriculaTurma")
    .select("bloqueado_inadimplencia, Turma(id, nome)")
    .eq("aluno_id", alunoId)
    .eq("afastado", false)
    .eq("bloqueado_inadimplencia", true);

  const matriculas = throwOnError(result);
  return matriculas.flatMap((m) => {
    const t = m.Turma as { id: string; nome: string } | { id: string; nome: string }[] | null;
    const turma = Array.isArray(t) ? t[0] : t;
    if (!turma) return [];
    return [{ turmaId: turma.id, turmaNome: turma.nome }];
  });
}

export async function preverDesbloqueioInadimplencia(
  alunoId: string,
  turmaId: string,
  pagamentoIdAPagar: string,
): Promise<{ bloqueado: boolean; desbloquearaAoPagar: boolean }> {
  const matriculaResult = await supabase
    .from("MatriculaTurma")
    .select("bloqueado_inadimplencia")
    .eq("aluno_id", alunoId)
    .eq("turma_id", turmaId)
    .eq("afastado", false)
    .maybeSingle();

  if (!matriculaResult.data?.bloqueado_inadimplencia) {
    return { bloqueado: false, desbloquearaAoPagar: false };
  }

  const pagResult = await supabase
    .from("Pagamento")
    .select("id, status, mes_referencia, vencimento")
    .eq("aluno_id", alunoId)
    .eq("turma_id", turmaId);

  const hoje = new Date();
  const simulados = (pagResult.data ?? []).map((p) =>
    p.id === pagamentoIdAPagar ? { ...p, status: "PAGO" } : p,
  );
  const atrasadas = contarAtrasadasPorTurma(simulados, turmaId, hoje);

  return {
    bloqueado: true,
    desbloquearaAoPagar: atrasadas < MESES_PARA_BLOQUEIO,
  };
}

export async function desbloquearInadimplencia(
  alunoId: string,
  turmaId: string,
  professorId: string,
) {
  const turmaCheck = await supabase
    .from("Turma")
    .select("id")
    .eq("id", turmaId)
    .eq("professor_id", professorId)
    .maybeSingle();

  if (!turmaCheck.data) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  const matriculaResult = await supabase
    .from("MatriculaTurma")
    .select("id, bloqueado_inadimplencia")
    .eq("aluno_id", alunoId)
    .eq("turma_id", turmaId)
    .eq("afastado", false)
    .maybeSingle();

  if (!matriculaResult.data) {
    throw new AppError(404, "NOT_FOUND", "Matrícula não encontrada");
  }

  if (!matriculaResult.data.bloqueado_inadimplencia) {
    throw new AppError(400, "NAO_BLOQUEADO", "Aluno não está bloqueado por inadimplência");
  }

  throwOnError(
    await supabase
      .from("MatriculaTurma")
      .update({ bloqueado_inadimplencia: false })
      .eq("id", matriculaResult.data.id),
  );

  return { ok: true };
}

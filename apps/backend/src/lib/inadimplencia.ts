import { execute, query, queryMaybeOne } from "./db.js";
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
  const matriculas = await query<{
    id: string;
    aluno_id: string;
    turma_id: string;
    bloqueado_inadimplencia: boolean;
  }>(
    `SELECT id, aluno_id, turma_id, bloqueado_inadimplencia
     FROM "MatriculaTurma"
     WHERE afastado = false`,
  );
  const hoje = new Date();

  for (const m of matriculas) {
    const pagamentos = await query<{
      status: string;
      mes_referencia: string;
      vencimento: string | null;
    }>(
      `SELECT status, mes_referencia, vencimento
       FROM "Pagamento"
       WHERE aluno_id = $1 AND turma_id = $2`,
      [m.aluno_id, m.turma_id],
    );
    const atrasadas = contarAtrasadasPorTurma(pagamentos, m.turma_id, hoje);
    const deveBloquear = atrasadas >= MESES_PARA_BLOQUEIO;

    if (deveBloquear !== m.bloqueado_inadimplencia) {
      await execute(
        `UPDATE "MatriculaTurma" SET bloqueado_inadimplencia = $1 WHERE id = $2`,
        [deveBloquear, m.id],
      );
    }
  }
}

export async function sincronizarBloqueioAluno(alunoId: string) {
  const matriculas = await query<{
    id: string;
    aluno_id: string;
    turma_id: string;
    bloqueado_inadimplencia: boolean;
  }>(
    `SELECT id, aluno_id, turma_id, bloqueado_inadimplencia
     FROM "MatriculaTurma"
     WHERE aluno_id = $1 AND afastado = false`,
    [alunoId],
  );
  const hoje = new Date();

  for (const m of matriculas) {
    const pagamentos = await query<{
      status: string;
      mes_referencia: string;
      vencimento: string | null;
    }>(
      `SELECT status, mes_referencia, vencimento
       FROM "Pagamento"
       WHERE aluno_id = $1 AND turma_id = $2`,
      [m.aluno_id, m.turma_id],
    );
    const atrasadas = contarAtrasadasPorTurma(pagamentos, m.turma_id, hoje);
    const deveBloquear = atrasadas >= MESES_PARA_BLOQUEIO;

    if (deveBloquear !== m.bloqueado_inadimplencia) {
      await execute(
        `UPDATE "MatriculaTurma" SET bloqueado_inadimplencia = $1 WHERE id = $2`,
        [deveBloquear, m.id],
      );
    }
  }
}

export async function listarBloqueiosAluno(alunoId: string) {
  const matriculas = await query<{ turma_id: string; turma_nome: string }>(
    `SELECT t.id AS turma_id, t.nome AS turma_nome
     FROM "MatriculaTurma" mt
     JOIN "Turma" t ON t.id = mt.turma_id
     WHERE mt.aluno_id = $1 AND mt.afastado = false AND mt.bloqueado_inadimplencia = true`,
    [alunoId],
  );

  return matriculas.map((m) => ({
    turmaId: m.turma_id,
    turmaNome: m.turma_nome,
  }));
}

export async function preverDesbloqueioInadimplencia(
  alunoId: string,
  turmaId: string,
  pagamentoIdAPagar: string,
): Promise<{ bloqueado: boolean; desbloquearaAoPagar: boolean }> {
  const matricula = await queryMaybeOne<{ bloqueado_inadimplencia: boolean }>(
    `SELECT bloqueado_inadimplencia
     FROM "MatriculaTurma"
     WHERE aluno_id = $1 AND turma_id = $2 AND afastado = false`,
    [alunoId, turmaId],
  );

  if (!matricula?.bloqueado_inadimplencia) {
    return { bloqueado: false, desbloquearaAoPagar: false };
  }

  const pagamentos = await query<{
    id: string;
    status: string;
    mes_referencia: string;
    vencimento: string | null;
  }>(
    `SELECT id, status, mes_referencia, vencimento
     FROM "Pagamento"
     WHERE aluno_id = $1 AND turma_id = $2`,
    [alunoId, turmaId],
  );

  const hoje = new Date();
  const simulados = pagamentos.map((p) =>
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
  const turma = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "Turma" WHERE id = $1 AND professor_id = $2`,
    [turmaId, professorId],
  );

  if (!turma) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  const matricula = await queryMaybeOne<{ id: string; bloqueado_inadimplencia: boolean }>(
    `SELECT id, bloqueado_inadimplencia
     FROM "MatriculaTurma"
     WHERE aluno_id = $1 AND turma_id = $2 AND afastado = false`,
    [alunoId, turmaId],
  );

  if (!matricula) {
    throw new AppError(404, "NOT_FOUND", "Matrícula não encontrada");
  }

  if (!matricula.bloqueado_inadimplencia) {
    throw new AppError(400, "NAO_BLOQUEADO", "Aluno não está bloqueado por inadimplência");
  }

  await execute(
    `UPDATE "MatriculaTurma" SET bloqueado_inadimplencia = false WHERE id = $1`,
    [matricula.id],
  );

  return { ok: true };
}

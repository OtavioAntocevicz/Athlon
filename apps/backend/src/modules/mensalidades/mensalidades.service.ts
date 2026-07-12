import { supabase } from "../../config/supabase.js";
import { generateId, now, throwOnError, turmaIdsDoProfessor } from "../../lib/db.js";
import { AppError } from "../../middleware/error-handler.js";
import {
  addMeses,
  calcularVencimento,
  inicioDoMes,
  isMesFuturo,
  toMesReferenciaDate,
} from "../../lib/utils.js";
import type { StatusMensalidade } from "@athlon/shared-types";

type TurmaRow = {
  id: string;
  mensalidade_centavos: number | null;
  dia_vencimento: number | null;
};

type MatriculaRow = { aluno_id: string };

async function upsertPagamento(
  alunoId: string,
  turmaId: string,
  mesRef: Date,
  vencimento: Date,
  valorCentavos: number,
) {
  const ts = now();
  const { error } = await supabase.from("Pagamento").upsert(
    {
      id: generateId(),
      aluno_id: alunoId,
      turma_id: turmaId,
      mes_referencia: toMesReferenciaDate(mesRef),
      vencimento: toMesReferenciaDate(vencimento),
      valor_centavos: valorCentavos,
      status: "PENDENTE",
      criado_em: ts,
      atualizado_em: ts,
    },
    { onConflict: "aluno_id,turma_id,mes_referencia", ignoreDuplicates: true },
  );
  if (error) throw new AppError(500, "DB_ERROR", error.message);
}

export async function gerarMensalidadesParaTurma(turmaId: string, meses = 1) {
  const turmaResult = await supabase
    .from("Turma")
    .select("id, mensalidade_centavos, dia_vencimento")
    .eq("id", turmaId)
    .single();

  const turma = throwOnError(turmaResult, {
    message: "Turma não encontrada",
  }) as TurmaRow;

  if (!turma.mensalidade_centavos || !turma.dia_vencimento) return;

  const matriculasResult = await supabase
    .from("MatriculaTurma")
    .select("aluno_id")
    .eq("turma_id", turmaId)
    .eq("afastado", false);

  const matriculas = throwOnError(matriculasResult) as MatriculaRow[];

  const inicio = inicioDoMes();
  for (let i = 0; i < meses; i++) {
    const mesRef = addMeses(inicio, i);
    const vencimento = calcularVencimento(mesRef, turma.dia_vencimento);

    for (const matricula of matriculas) {
      await upsertPagamento(
        matricula.aluno_id,
        turmaId,
        mesRef,
        vencimento,
        turma.mensalidade_centavos,
      );
    }
  }
}

export async function gerarMensalidadesParaAluno(alunoId: string, turmaId: string) {
  const turmaResult = await supabase
    .from("Turma")
    .select("id, mensalidade_centavos, dia_vencimento")
    .eq("id", turmaId)
    .single();

  const turma = throwOnError(turmaResult, {
    message: "Turma não encontrada",
  }) as TurmaRow;

  if (!turma.mensalidade_centavos || !turma.dia_vencimento) return;

  const mesRef = inicioDoMes();
  const vencimento = calcularVencimento(mesRef, turma.dia_vencimento);
  await upsertPagamento(
    alunoId,
    turmaId,
    mesRef,
    vencimento,
    turma.mensalidade_centavos,
  );
}

export async function marcarAtrasados() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const { error } = await supabase
    .from("Pagamento")
    .update({ status: "ATRASADO" })
    .lt("vencimento", hoje.toISOString())
    .in("status", ["PENDENTE", "RECUSADO"]);

  if (error) throw new AppError(500, "DB_ERROR", error.message);
}

export async function listarMensalidades(filters: {
  professorId?: string;
  alunoId?: string;
  turmaId?: string;
  status?: StatusMensalidade;
}) {
  let query = supabase
    .from("Pagamento")
    .select("*, Aluno(nome), Turma(nome), Comprovante(arquivo_url, ativo)")
    .order("mes_referencia", { ascending: false });

  if (filters.alunoId) query = query.eq("aluno_id", filters.alunoId);
  if (filters.turmaId) query = query.eq("turma_id", filters.turmaId);
  if (filters.status) query = query.eq("status", filters.status);

  if (filters.professorId) {
    const ids = await turmaIdsDoProfessor(filters.professorId);
    if (ids.length === 0) return [];
    query = query.in("turma_id", ids);
  }

  const { data, error } = await query;
  if (error) throw new AppError(500, "DB_ERROR", error.message);

  const visiveis = (data ?? []).filter((p) => !isMesFuturo(p.mes_referencia));

  return visiveis.map((p) => {
    const comprovantes = (p.Comprovante ?? []) as {
      arquivo_url: string;
      ativo: boolean;
    }[];
    const ativo = comprovantes.find((c) => c.ativo);
    const emAnalise = p.status === "EM_ANALISE";

    return {
      id: p.id,
      alunoId: p.aluno_id,
      alunoNome: (p.Aluno as { nome: string })?.nome ?? "",
      turmaId: p.turma_id,
      turmaNome: (p.Turma as { nome: string })?.nome ?? "",
      mesReferencia: new Date(p.mes_referencia).toISOString(),
      vencimento: p.vencimento ? new Date(p.vencimento).toISOString() : null,
      valorCentavos: p.valor_centavos,
      status: p.status,
      comprovanteUrl: ativo?.arquivo_url ?? null,
      comprovanteEmAnalise: emAnalise,
      // Preview só no detalhe (evita signed URL em massa na listagem)
      comprovantePreviewUrl: null,
    };
  });
}

export async function getMensalidade(
  id: string,
  user: { perfil: string; professorId?: string; alunoId?: string },
) {
  const result = await supabase
    .from("Pagamento")
    .select("*, Aluno(nome), Turma(nome, professor_id, chave_pix), Comprovante(id, arquivo_url, ativo)")
    .eq("id", id)
    .single();

  const p = throwOnError(result, { message: "Mensalidade não encontrada" });
  const turma = p.Turma as {
    nome: string;
    professor_id: string;
    chave_pix: string | null;
  };

  if (user.perfil === "ALUNO" && p.aluno_id !== user.alunoId) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }
  if (user.perfil === "PROFESSOR" && turma.professor_id !== user.professorId) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }

  const comprovantes = (p.Comprovante ?? []) as {
    id: string;
    arquivo_url: string;
    ativo: boolean;
  }[];
  const ativo = comprovantes.find((c) => c.ativo);

  let inadimplencia: { bloqueado: boolean; desbloquearaAoPagar: boolean } | null =
    null;
  if (user.perfil === "PROFESSOR" && p.status !== "PAGO") {
    const { preverDesbloqueioInadimplencia } = await import("../../lib/inadimplencia.js");
    inadimplencia = await preverDesbloqueioInadimplencia(
      p.aluno_id,
      p.turma_id,
      p.id,
    );
  }

  return {
    id: p.id,
    alunoId: p.aluno_id,
    alunoNome: (p.Aluno as { nome: string })?.nome ?? "",
    turmaId: p.turma_id,
    turmaNome: turma.nome,
    chavePix: turma.chave_pix,
    mesReferencia: new Date(p.mes_referencia).toISOString(),
    vencimento: p.vencimento ? new Date(p.vencimento).toISOString() : null,
    valorCentavos: p.valor_centavos,
    status: p.status,
    comprovanteUrl: ativo?.arquivo_url ?? null,
    comprovanteId: ativo?.id ?? null,
    inadimplencia,
  };
}

export async function marcarPagoManual(
  id: string,
  professorId: string,
) {
  const result = await supabase
    .from("Pagamento")
    .select("*, Turma(professor_id), Aluno(usuario_id, nome)")
    .eq("id", id)
    .single();

  const p = throwOnError(result, { message: "Mensalidade não encontrada" });
  const turma = p.Turma as { professor_id: string };
  if (turma.professor_id !== professorId) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }

  if (p.status === "PAGO") {
    throw new AppError(400, "JA_PAGO", "Mensalidade já está paga");
  }

  const ts = now();
  await supabase
    .from("Comprovante")
    .update({ ativo: false })
    .eq("pagamento_id", id);

  await supabase
    .from("Pagamento")
    .update({
      status: "PAGO",
      validado_por_id: professorId,
      validado_em: ts,
      atualizado_em: ts,
    })
    .eq("id", id);

  const aluno = p.Aluno as { usuario_id: string | null; nome: string };
  if (aluno.usuario_id) {
    const { criarNotificacao } = await import("../../lib/notificacoes.js");
    const mes = new Date(p.mes_referencia).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    await criarNotificacao(
      aluno.usuario_id,
      "Pagamento confirmado",
      `Sua mensalidade de ${mes} foi confirmada pelo professor.`,
      "PAGAMENTO_CONFIRMADO",
      `/mensalidades/${id}`,
    );
  }

  const { sincronizarBloqueioAluno } = await import("../../lib/inadimplencia.js");
  await sincronizarBloqueioAluno(p.aluno_id);

  return { ok: true };
}

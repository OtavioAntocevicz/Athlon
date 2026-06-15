import { supabase } from "../../config/supabase.js";
import { generateId, now, relOne, throwOnError, turmaIdsDoProfessor } from "../../lib/db.js";
import { AppError } from "../../middleware/error-handler.js";
import { getSignedReadUrl } from "./storage.service.js";

const STATUS_ENVIAVEL = ["PENDENTE", "RECUSADO", "ATRASADO"] as const;

export async function confirmarComprovante(
  pagamentoId: string,
  alunoId: string,
  arquivoUrl: string,
) {
  const pagResult = await supabase
    .from("Pagamento")
    .select("*")
    .eq("id", pagamentoId)
    .single();

  const pagamento = throwOnError(pagResult, { message: "Mensalidade não encontrada" });

  if (pagamento.aluno_id !== alunoId) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }

  if (!STATUS_ENVIAVEL.includes(pagamento.status as (typeof STATUS_ENVIAVEL)[number])) {
    throw new AppError(400, "INVALID_STATUS", "Mensalidade não pode receber comprovante");
  }

  await supabase
    .from("Comprovante")
    .update({ ativo: false })
    .eq("pagamento_id", pagamentoId);

  const comprovanteId = generateId();
  const ts = now();

  const comprovanteResult = await supabase
    .from("Comprovante")
    .insert({
      id: comprovanteId,
      pagamento_id: pagamentoId,
      arquivo_url: arquivoUrl,
      enviado_em: ts,
      ativo: true,
    })
    .select()
    .single();

  const comprovante = throwOnError(comprovanteResult);

  await supabase
    .from("Pagamento")
    .update({ status: "EM_ANALISE" })
    .eq("id", pagamentoId);

  return comprovante;
}

export async function filaAprovacao(professorId: string) {
  const turmaIds = await turmaIdsDoProfessor(professorId);
  if (turmaIds.length === 0) return [];

  const pagamentosResult = await supabase
    .from("Pagamento")
    .select("id")
    .eq("status", "EM_ANALISE")
    .in("turma_id", turmaIds);

  const pagamentoIds = (pagamentosResult.data ?? []).map((p) => p.id);
  if (pagamentoIds.length === 0) return [];

  const { data: items, error } = await supabase
    .from("Comprovante")
    .select("*, Pagamento(*, Aluno(nome), Turma(nome))")
    .eq("ativo", true)
    .in("pagamento_id", pagamentoIds)
    .order("enviado_em", { ascending: true });

  if (error) throw new AppError(500, "DB_ERROR", error.message);

  return Promise.all(
    (items ?? []).map(async (c) => {
      const pag = c.Pagamento as {
        id: string;
        mes_referencia: string;
        valor_centavos: number;
        Aluno: { nome: string };
        Turma: { nome: string };
      };

      return {
        id: c.id,
        pagamentoId: c.pagamento_id,
        alunoNome: pag.Aluno.nome,
        turmaNome: pag.Turma.nome,
        mesReferencia: new Date(pag.mes_referencia).toISOString(),
        valorCentavos: pag.valor_centavos,
        enviadoEm: new Date(c.enviado_em).toISOString(),
        arquivoUrl: await getSignedReadUrl(c.arquivo_url),
      };
    }),
  );
}

export async function getComprovante(id: string, professorId: string) {
  const result = await supabase
    .from("Comprovante")
    .select("*, Pagamento(*, Aluno(nome), Turma(nome, professor_id))")
    .eq("id", id)
    .single();

  const c = throwOnError(result, { message: "Comprovante não encontrado" });
  const pag = c.Pagamento as {
    id: string;
    aluno_id: string;
    turma_id: string;
    mes_referencia: string;
    valor_centavos: number;
    vencimento: string | null;
    status: string;
    Aluno: { nome: string };
    Turma: { nome: string; professor_id: string };
  };

  if (pag.Turma.professor_id !== professorId) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }

  const { preverDesbloqueioInadimplencia } = await import("../../lib/inadimplencia.js");
  const inadimplencia = await preverDesbloqueioInadimplencia(
    pag.aluno_id,
    pag.turma_id,
    pag.id,
  );

  return {
    id: c.id,
    pagamentoId: c.pagamento_id,
    alunoNome: pag.Aluno.nome,
    turmaNome: pag.Turma.nome,
    mesReferencia: new Date(pag.mes_referencia).toISOString(),
    valorCentavos: pag.valor_centavos,
    vencimento: pag.vencimento ? new Date(pag.vencimento).toISOString() : null,
    status: pag.status,
    enviadoEm: new Date(c.enviado_em).toISOString(),
    arquivoUrl: await getSignedReadUrl(c.arquivo_url),
    inadimplencia,
  };
}

export async function aprovarComprovante(
  comprovanteId: string,
  professorId: string,
) {
  const result = await supabase
    .from("Comprovante")
    .select("*, Pagamento(*, Turma(professor_id))")
    .eq("id", comprovanteId)
    .single();

  const c = throwOnError(result, { message: "Comprovante não encontrado" });
  const pag = c.Pagamento as {
    id: string;
    aluno_id: string;
    Turma: { professor_id: string };
  };

  if (pag.Turma.professor_id !== professorId) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }

  const ts = now();
  await supabase
    .from("Pagamento")
    .update({
      status: "PAGO",
      validado_por_id: professorId,
      validado_em: ts,
    })
    .eq("id", pag.id);

  await supabase
    .from("Comprovante")
    .update({ revisado_em: ts })
    .eq("id", comprovanteId);

  const pagDetail = await supabase
    .from("Pagamento")
    .select("mes_referencia, Aluno(usuario_id)")
    .eq("id", pag.id)
    .single();

  const aluno = relOne(pagDetail.data?.Aluno as { usuario_id: string | null } | { usuario_id: string | null }[] | null);
  if (aluno?.usuario_id) {
    const { criarNotificacao } = await import("../../lib/notificacoes.js");
    const mes = pagDetail.data?.mes_referencia
      ? new Date(pagDetail.data.mes_referencia).toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })
      : "referência";
    await criarNotificacao(
      aluno.usuario_id,
      "Comprovante aprovado",
      `Seu comprovante de pagamento de ${mes} foi aprovado.`,
      "COMPROVANTE_APROVADO",
    );
  }

  const { sincronizarBloqueioAluno } = await import("../../lib/inadimplencia.js");
  await sincronizarBloqueioAluno(pag.aluno_id);

  return { ok: true };
}

export async function recusarComprovante(
  comprovanteId: string,
  professorId: string,
  motivo: string,
) {
  const result = await supabase
    .from("Comprovante")
    .select("*, Pagamento(*, Turma(professor_id))")
    .eq("id", comprovanteId)
    .single();

  const c = throwOnError(result, { message: "Comprovante não encontrado" });
  const pag = c.Pagamento as { id: string; Turma: { professor_id: string } };

  if (pag.Turma.professor_id !== professorId) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }

  const ts = now();
  await supabase.from("Pagamento").update({ status: "RECUSADO" }).eq("id", pag.id);

  await supabase
    .from("Comprovante")
    .update({
      revisado_em: ts,
      motivo_recusa: motivo,
      ativo: false,
    })
    .eq("id", comprovanteId);

  const pagDetail = await supabase
    .from("Pagamento")
    .select("mes_referencia, Aluno(usuario_id)")
    .eq("id", pag.id)
    .single();

  const aluno = relOne(pagDetail.data?.Aluno as { usuario_id: string | null } | { usuario_id: string | null }[] | null);
  if (aluno?.usuario_id) {
    const { criarNotificacao } = await import("../../lib/notificacoes.js");
    await criarNotificacao(
      aluno.usuario_id,
      "Comprovante recusado",
      `Seu comprovante foi recusado. Motivo: ${motivo}. Envie um novo comprovante.`,
      "COMPROVANTE_RECUSADO",
    );
  }

  return { ok: true };
}

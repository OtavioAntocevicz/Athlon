import { supabase } from "../../config/supabase.js";
import { generateId, now, relOne, throwOnError } from "../../lib/db.js";
import { AppError } from "../../middleware/error-handler.js";
import { gerarCodigoConvite } from "../../lib/utils.js";
import type { CreateTurmaInput, UpdateTurmaInput } from "@athlon/shared-types";
import { statusEfetivo } from "../../lib/mensalidade-focus.js";
import { isMesFuturo } from "../../lib/utils.js";
import { gerarMensalidadesParaTurma } from "../mensalidades/mensalidades.service.js";
import type { UpdateTurmaBasicoInput } from "@athlon/shared-types";

export async function listarTurmas(professorId: string) {
  const { data: turmas, error } = await supabase
    .from("Turma")
    .select("*")
    .eq("professor_id", professorId)
    .order("criado_em", { ascending: false });

  if (error) throw new AppError(500, "DB_ERROR", error.message);

  const result = [];
  for (const t of turmas ?? []) {
    const { count } = await supabase
      .from("MatriculaTurma")
      .select("*", { count: "exact", head: true })
      .eq("turma_id", t.id)
      .eq("afastado", false);

    result.push({
      id: t.id,
      nome: t.nome,
      modalidade: t.modalidade,
      nivel: t.nivel,
      codigoConvite: t.codigo_convite,
      mensalidadeCentavos: t.mensalidade_centavos,
      diaVencimento: t.dia_vencimento,
      chavePix: t.chave_pix,
      local: t.local,
      horarioInicio: t.horario_inicio,
      horarioFim: t.horario_fim,
      diasTreino: t.dias_treino,
      totalAlunos: count ?? 0,
      fotoUrl: (t.foto_url as string | null) ?? null,
      criadoEm: new Date(t.criado_em).toISOString(),
    });
  }

  return result;
}

export async function criarTurma(professorId: string, input: CreateTurmaInput) {
  const id = generateId();
  const ts = now();

  let chavePix = input.chavePix?.trim() ?? "";
  if (!chavePix) {
    const prof = await supabase
      .from("Professor")
      .select("chave_pix")
      .eq("id", professorId)
      .maybeSingle();
    chavePix = prof.data?.chave_pix?.trim() ?? "";
  }
  if (!chavePix) {
    throw new AppError(400, "PIX_REQUIRED", "Chave PIX é obrigatória");
  }

  const result = await supabase.from("Turma").insert({
    id,
    professor_id: professorId,
    nome: input.nome,
    modalidade: input.modalidade,
    nivel: input.nivel,
    mensalidade_centavos: input.mensalidadeCentavos,
    dia_vencimento: input.diaVencimento,
    chave_pix: chavePix,
    local: input.local,
    horario_inicio: input.horarioInicio,
    horario_fim: input.horarioFim,
    dias_treino: input.diasTreino ?? null,
    codigo_convite: gerarCodigoConvite(),
    criado_em: ts,
    atualizado_em: ts,
  }).select().single();

  const turma = throwOnError(result);
  await gerarMensalidadesParaTurma(turma.id);
  return turma;
}

export async function getTurma(id: string, professorId: string) {
  const turmaResult = await supabase
    .from("Turma")
    .select("*")
    .eq("id", id)
    .eq("professor_id", professorId)
    .maybeSingle();

  const turma = turmaResult.data;
  if (!turma) throw new AppError(404, "NOT_FOUND", "Turma não encontrada");

  const matriculasResult = await supabase
    .from("MatriculaTurma")
    .select("*, Aluno(*)")
    .eq("turma_id", id)
    .eq("afastado", false);

  return mapTurmaDetalhe(turma, throwOnError(matriculasResult).length);
}

export async function atualizarTurmaBasico(
  id: string,
  professorId: string,
  input: UpdateTurmaBasicoInput,
) {
  const existing = await supabase
    .from("Turma")
    .select("id")
    .eq("id", id)
    .eq("professor_id", professorId)
    .maybeSingle();

  if (!existing.data) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  const result = await supabase
    .from("Turma")
    .update({
      nome: input.nome,
      modalidade: input.modalidade,
      nivel: input.nivel,
      mensalidade_centavos: input.mensalidadeCentavos,
      dia_vencimento: input.diaVencimento,
      chave_pix: input.chavePix,
      local: input.local ?? null,
      horario_inicio: input.horarioInicio ?? null,
      horario_fim: input.horarioFim ?? null,
      atualizado_em: now(),
    })
    .eq("id", id)
    .select()
    .single();

  const turma = throwOnError(result);

  const { count } = await supabase
    .from("MatriculaTurma")
    .select("*", { count: "exact", head: true })
    .eq("turma_id", id)
    .eq("afastado", false);

  return mapTurmaDetalhe(turma, count ?? 0);
}

function mapTurmaDetalhe(turma: Record<string, unknown>, totalAlunos: number) {
  return {
    id: turma.id as string,
    nome: turma.nome as string,
    modalidade: turma.modalidade as string,
    nivel: turma.nivel as string,
    codigoConvite: turma.codigo_convite as string,
    mensalidadeCentavos: turma.mensalidade_centavos as number,
    diaVencimento: turma.dia_vencimento as number,
    chavePix: turma.chave_pix as string,
    local: turma.local as string | null,
    horarioInicio: turma.horario_inicio as string | null,
    horarioFim: turma.horario_fim as string | null,
    fotoUrl: (turma.foto_url as string | null) ?? null,
    totalAlunos,
  };
}

export async function atualizarTurma(
  id: string,
  professorId: string,
  input: UpdateTurmaInput,
) {
  const existing = await supabase
    .from("Turma")
    .select("id")
    .eq("id", id)
    .eq("professor_id", professorId)
    .maybeSingle();

  if (!existing.data) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  const patch: Record<string, unknown> = { atualizado_em: now() };
  if (input.nome !== undefined) patch.nome = input.nome;
  if (input.modalidade !== undefined) patch.modalidade = input.modalidade;
  if (input.nivel !== undefined) patch.nivel = input.nivel;
  if (input.mensalidadeCentavos !== undefined) patch.mensalidade_centavos = input.mensalidadeCentavos;
  if (input.diaVencimento !== undefined) patch.dia_vencimento = input.diaVencimento;
  if (input.chavePix !== undefined) patch.chave_pix = input.chavePix;
  if (input.local !== undefined) patch.local = input.local;
  if (input.horarioInicio !== undefined) patch.horario_inicio = input.horarioInicio;
  if (input.horarioFim !== undefined) patch.horario_fim = input.horarioFim;
  if (input.diasTreino !== undefined) patch.dias_treino = input.diasTreino;

  const result = await supabase
    .from("Turma")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  return throwOnError(result);
}

export async function listarAlunosTurma(turmaId: string, professorId: string) {
  const turmaCheck = await supabase
    .from("Turma")
    .select("id")
    .eq("id", turmaId)
    .eq("professor_id", professorId)
    .maybeSingle();

  if (!turmaCheck.data) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  const matriculasResult = await supabase
    .from("MatriculaTurma")
    .select("matriculado_em, posicao, numero_camisa, Aluno(*)")
    .eq("turma_id", turmaId)
    .eq("afastado", false);

  const matriculas = throwOnError(matriculasResult);
  const hoje = new Date();

  const result = [];
  for (const m of matriculas) {
    const aluno = relOne(m.Aluno) as {
      id: string;
      nome: string;
      sobrenome: string | null;
      rg: string | null;
      telefone: string | null;
      email: string | null;
    };
    if (!aluno) continue;

    const pagResult = await supabase
      .from("Pagamento")
      .select("status, mes_referencia, vencimento")
      .eq("aluno_id", aluno.id)
      .eq("turma_id", turmaId)
      .order("mes_referencia", { ascending: false });

    const pagamentos = (pagResult.data ?? []).filter(
      (p) => !isMesFuturo(p.mes_referencia, hoje),
    );
    const ultimo = pagamentos[0];
    const statusFinanceiro = ultimo
      ? statusEfetivo(ultimo, hoje)
      : "PENDENTE";

    result.push({
      id: aluno.id,
      nome: aluno.nome,
      sobrenome: aluno.sobrenome ?? "",
      rg: aluno.rg,
      telefone: aluno.telefone,
      email: aluno.email,
      numeroCamisa: m.numero_camisa,
      posicao: m.posicao,
      statusFinanceiro,
      matriculadoEm: new Date(m.matriculado_em).toISOString(),
    });
  }

  return result;
}

export async function excluirTurma(id: string, professorId: string) {
  const turmaCheck = await supabase
    .from("Turma")
    .select("id, nome, foto_url")
    .eq("id", id)
    .eq("professor_id", professorId)
    .maybeSingle();

  if (!turmaCheck.data) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  const { removerArquivoStorage } = await import("../comprovantes/storage.service.js");
  const { removerFotoTurmaStorage } = await import("./turma-foto.storage.js");

  try {
    await removerFotoTurmaStorage(turmaCheck.data.foto_url);
  } catch {
    /* ignora falha de storage */
  }

  const eventosResult = await supabase.from("Evento").select("id").eq("turma_id", id);
  const eventoIds = (eventosResult.data ?? []).map((e) => e.id);
  if (eventoIds.length > 0) {
    throwOnError(await supabase.from("Presenca").delete().in("evento_id", eventoIds));
  }

  const pagamentosResult = await supabase.from("Pagamento").select("id").eq("turma_id", id);
  const pagamentoIds = (pagamentosResult.data ?? []).map((p) => p.id);

  if (pagamentoIds.length > 0) {
    const compsResult = await supabase
      .from("Comprovante")
      .select("arquivo_url")
      .in("pagamento_id", pagamentoIds);

    for (const c of compsResult.data ?? []) {
      try {
        await removerArquivoStorage(c.arquivo_url);
      } catch {
        /* ignora falha de storage */
      }
    }

    throwOnError(await supabase.from("Comprovante").delete().in("pagamento_id", pagamentoIds));
    throwOnError(await supabase.from("Pagamento").delete().in("id", pagamentoIds));
  }

  throwOnError(await supabase.from("Evento").delete().eq("turma_id", id));
  throwOnError(await supabase.from("MatriculaTurma").delete().eq("turma_id", id));
  throwOnError(await supabase.from("Turma").delete().eq("id", id));

  return { ok: true, nome: turmaCheck.data.nome };
}

export async function criarUploadUrlFoto(
  turmaId: string,
  professorId: string,
  contentType: string,
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

  const { criarUploadUrlFotoTurma } = await import("./turma-foto.storage.js");
  return criarUploadUrlFotoTurma(turmaId, contentType);
}

export async function atualizarFotoTurma(
  turmaId: string,
  professorId: string,
  fotoUrl: string,
) {
  const existing = await supabase
    .from("Turma")
    .select("id, foto_url")
    .eq("id", turmaId)
    .eq("professor_id", professorId)
    .maybeSingle();

  if (!existing.data) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  const antiga = existing.data.foto_url as string | null;

  // Grava a nova primeiro; só remove a antiga depois do sucesso no banco.
  // Se o upload ou este PATCH falhar, a foto antiga permanece intacta.
  const result = await supabase
    .from("Turma")
    .update({ foto_url: fotoUrl, atualizado_em: now() })
    .eq("id", turmaId)
    .select()
    .single();

  const turma = throwOnError(result);

  if (antiga && antiga !== fotoUrl) {
    const { removerFotoTurmaStorage } = await import("./turma-foto.storage.js");
    try {
      await removerFotoTurmaStorage(antiga);
    } catch {
      /* ignora falha de limpeza - a nova já está salva */
    }
  }

  const { count } = await supabase
    .from("MatriculaTurma")
    .select("*", { count: "exact", head: true })
    .eq("turma_id", turmaId)
    .eq("afastado", false);

  return mapTurmaDetalhe(turma, count ?? 0);
}

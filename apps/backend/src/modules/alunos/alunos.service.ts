import bcrypt from "bcryptjs";
import { supabase } from "../../config/supabase.js";
import {
  generateId,
  matricularAlunoTurma,
  now,
  relOne,
  throwOnError,
  turmaIdsDoProfessor,
} from "../../lib/db.js";
import { AppError } from "../../middleware/error-handler.js";
import type {
  CreateAlunoInput,
  UpdateAlunoInput,
  UpdateMatriculaInput,
} from "@athlon/shared-types";
import { statusEfetivo } from "../../lib/mensalidade-focus.js";
import { isMesFuturo } from "../../lib/utils.js";
import { gerarMensalidadesParaAluno } from "../mensalidades/mensalidades.service.js";

export async function listarAlunos(professorId: string) {
  const turmaIds = await turmaIdsDoProfessor(professorId);
  if (turmaIds.length === 0) return [];

  const matriculasResult = await supabase
    .from("MatriculaTurma")
    .select("aluno_id, Turma(id, nome), Aluno(*)")
    .in("turma_id", turmaIds)
    .eq("afastado", false);

  const matriculas = throwOnError(matriculasResult);
  const hoje = new Date();
  const byAluno = new Map<
    string,
    {
      id: string;
      nome: string;
      sobrenome: string | null;
      telefone: string | null;
      email: string | null;
      turmas: { id: string; nome: string }[];
    }
  >();

  for (const m of matriculas) {
    const aluno = relOne(m.Aluno) as {
      id: string;
      nome: string;
      sobrenome: string | null;
      telefone: string | null;
      email: string | null;
    };
    if (!aluno) continue;

    const turma = relOne(m.Turma) as { id: string; nome: string };
    if (!turma) continue;

    const entry = byAluno.get(aluno.id) ?? {
      id: aluno.id,
      nome: aluno.nome,
      sobrenome: aluno.sobrenome,
      telefone: aluno.telefone,
      email: aluno.email,
      turmas: [],
    };
    if (!entry.turmas.some((t) => t.id === turma.id)) {
      entry.turmas.push({ id: turma.id, nome: turma.nome });
    }
    byAluno.set(aluno.id, entry);
  }

  const result = [];
  for (const aluno of byAluno.values()) {
    const pagResult = await supabase
      .from("Pagamento")
      .select("status, mes_referencia, vencimento")
      .eq("aluno_id", aluno.id)
      .order("mes_referencia", { ascending: false });

    const pagamentos = (pagResult.data ?? []).filter(
      (p) => !isMesFuturo(p.mes_referencia, hoje),
    );
    const ultimo = pagamentos[0];
    const statusFinanceiro = ultimo ? statusEfetivo(ultimo, hoje) : "PENDENTE";
    const nomeCompleto = [aluno.nome, aluno.sobrenome].filter(Boolean).join(" ");

    result.push({
      id: aluno.id,
      nome: nomeCompleto,
      telefone: aluno.telefone,
      email: aluno.email,
      turmas: aluno.turmas,
      turmaNome: aluno.turmas.map((t) => t.nome).join(", "),
      turmaId: aluno.turmas[0]?.id ?? null,
      statusFinanceiro,
    });
  }

  return result.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function getAluno(
  id: string,
  user: { perfil: string; professorId?: string; alunoId?: string },
) {
  const alunoResult = await supabase
    .from("Aluno")
    .select("*")
    .eq("id", id)
    .single();

  const aluno = throwOnError(alunoResult, { message: "Aluno não encontrado" });

  if (user.perfil === "ALUNO" && aluno.id !== user.alunoId) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }

  const matriculasResult = await supabase
    .from("MatriculaTurma")
    .select("posicao, numero_camisa, bloqueado_inadimplencia, Turma(id, nome, professor_id)")
    .eq("aluno_id", id)
    .eq("afastado", false);

  const matriculas = throwOnError(matriculasResult);

  if (user.perfil === "PROFESSOR") {
    const owns = matriculas.some((m) => {
      const t = relOne(m.Turma) as { professor_id: string } | undefined;
      return t?.professor_id === user.professorId;
    });
    if (!owns) throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }

  const pagamentosResult = await supabase
    .from("Pagamento")
    .select("*")
    .eq("aluno_id", id)
    .order("mes_referencia", { ascending: false })
    .limit(12);

  const pagamentos = throwOnError(pagamentosResult);
  const hoje = new Date();

  const mensalidades = pagamentos
    .filter((p) => !isMesFuturo(p.mes_referencia, hoje))
    .map((p) => ({
      id: p.id,
      mesReferencia: p.mes_referencia,
      valorCentavos: p.valor_centavos,
      status: statusEfetivo(p, hoje),
      vencimento: p.vencimento ?? null,
    }));

  return {
    id: aluno.id,
    nome: aluno.nome,
    sobrenome: aluno.sobrenome ?? "",
    telefone: aluno.telefone,
    email: aluno.email,
    rg: aluno.rg ?? null,
    cpf: aluno.cpf ?? null,
    turmas: matriculas.flatMap((m) => {
      const t = relOne(m.Turma) as { id: string; nome: string } | undefined;
      if (!t) return [];
      return [
        {
          id: t.id,
          nome: t.nome,
          numeroCamisa: m.numero_camisa,
          posicao: m.posicao,
          bloqueadoInadimplencia: m.bloqueado_inadimplencia ?? false,
        },
      ];
    }),
    mensalidades,
  };
}

export async function adicionarAlunoTurma(
  turmaId: string,
  professorId: string,
  input: CreateAlunoInput,
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

  let alunoId: string;
  const ts = now();

  if (input.email) {
    const usuarioResult = await supabase
      .from("Usuario")
      .select("id, Aluno(id)")
      .eq("email", input.email)
      .maybeSingle();

    const usuario = usuarioResult.data as {
      id: string;
      Aluno: { id: string }[] | { id: string } | null;
    } | null;

    const existingAluno = relOne(usuario?.Aluno);

    if (existingAluno) {
      alunoId = existingAluno.id;
    } else {
      const senha = input.senha ?? Math.random().toString(36).slice(2, 10);
      const senha_hash = await bcrypt.hash(senha, 12);
      const usuarioId = generateId();
      alunoId = generateId();

      throwOnError(
        await supabase.from("Usuario").insert({
          id: usuarioId,
          email: input.email,
          nome: input.nome,
          senha_hash,
          perfil: "ALUNO",
          criado_em: ts,
          atualizado_em: ts,
        }),
      );

      throwOnError(
        await supabase.from("Aluno").insert({
          id: alunoId,
          usuario_id: usuarioId,
          nome: input.nome,
          email: input.email,
          telefone: input.telefone,
          criado_em: ts,
          atualizado_em: ts,
        }),
      );
    }
  } else {
    alunoId = generateId();
    throwOnError(
      await supabase.from("Aluno").insert({
        id: alunoId,
        nome: input.nome,
        telefone: input.telefone,
        criado_em: ts,
        atualizado_em: ts,
      }),
    );
  }

  await matricularAlunoTurma(alunoId, turmaId);
  await gerarMensalidadesParaAluno(alunoId, turmaId);

  const alunoResult = await supabase.from("Aluno").select("*").eq("id", alunoId).single();
  return throwOnError(alunoResult);
}

export async function previewTurmaPorCodigo(alunoId: string, codigoConvite: string) {
  const turmaResult = await supabase
    .from("Turma")
    .select("*")
    .eq("codigo_convite", codigoConvite.trim())
    .maybeSingle();

  const turma = turmaResult.data;
  if (!turma) throw new AppError(404, "CONVITE_INVALIDO", "Código inválido");

  const matricula = await supabase
    .from("MatriculaTurma")
    .select("id")
    .eq("aluno_id", alunoId)
    .eq("turma_id", turma.id)
    .eq("afastado", false)
    .maybeSingle();

  return {
    id: turma.id,
    nome: turma.nome,
    modalidade: turma.modalidade,
    nivel: turma.nivel,
    local: turma.local,
    horarioInicio: turma.horario_inicio,
    horarioFim: turma.horario_fim,
    mensalidadeCentavos: turma.mensalidade_centavos,
    diaVencimento: turma.dia_vencimento,
    codigoConvite: turma.codigo_convite,
    jaMatriculado: !!matricula.data,
  };
}

export async function entrarTurma(alunoId: string, codigoConvite: string) {
  const preview = await previewTurmaPorCodigo(alunoId, codigoConvite);
  if (preview.jaMatriculado) {
    throw new AppError(409, "JA_MATRICULADO", "Você já está nesta turma");
  }

  await matricularAlunoTurma(alunoId, preview.id);
  await gerarMensalidadesParaAluno(alunoId, preview.id);
  return preview;
}

export async function desbloquearInadimplenciaAluno(
  alunoId: string,
  turmaId: string,
  professorId: string,
) {
  const { desbloquearInadimplencia } = await import("../../lib/inadimplencia.js");
  return desbloquearInadimplencia(alunoId, turmaId, professorId);
}

export async function atualizarAluno(
  id: string,
  user: { perfil: string; professorId?: string; alunoId?: string },
  input: UpdateAlunoInput,
) {
  if (user.perfil === "ALUNO" && id !== user.alunoId) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }

  const patch: Record<string, unknown> = { atualizado_em: now() };
  if (input.nome !== undefined) patch.nome = input.nome;
  if (input.sobrenome !== undefined) patch.sobrenome = input.sobrenome;
  if (input.telefone !== undefined) patch.telefone = input.telefone.replace(/\D/g, "");
  if (input.email !== undefined) patch.email = input.email;
  if (input.rg !== undefined) patch.rg = input.rg.trim();
  if (input.cpf !== undefined) patch.cpf = input.cpf?.replace(/\D/g, "") || null;

  const result = await supabase.from("Aluno").update(patch).eq("id", id).select().single();
  const aluno = throwOnError(result);

  if (user.perfil === "ALUNO" && (input.nome !== undefined || input.sobrenome !== undefined)) {
    const nomeCompleto = [aluno.nome, aluno.sobrenome].filter(Boolean).join(" ");
    await supabase
      .from("Usuario")
      .update({ nome: nomeCompleto, atualizado_em: now() })
      .eq("id", aluno.usuario_id);
  }

  return aluno;
}

export async function listarMinhasTurmas(alunoId: string) {
  const matriculasResult = await supabase
    .from("MatriculaTurma")
    .select("numero_camisa, posicao, Turma(*)")
    .eq("aluno_id", alunoId)
    .eq("afastado", false);

  const matriculas = throwOnError(matriculasResult);

  return matriculas.flatMap((m) => {
    const t = relOne(m.Turma) as {
      id: string;
      nome: string;
      modalidade: string;
      local: string | null;
      horario_inicio: string | null;
      horario_fim: string | null;
      mensalidade_centavos: number;
      codigo_convite: string;
      foto_url: string | null;
    } | null;
    if (!t) return [];
    return [
      {
        id: t.id,
        nome: t.nome,
        modalidade: t.modalidade,
        local: t.local,
        horarioInicio: t.horario_inicio,
        horarioFim: t.horario_fim,
        mensalidadeCentavos: t.mensalidade_centavos,
        codigoConvite: t.codigo_convite,
        fotoUrl: t.foto_url ?? null,
        numeroCamisa: m.numero_camisa,
        posicao: m.posicao,
      },
    ];
  });
}

export async function getMinhaTurma(alunoId: string, turmaId: string) {
  const matriculaResult = await supabase
    .from("MatriculaTurma")
    .select("numero_camisa, posicao, bloqueado_inadimplencia, Turma(*)")
    .eq("aluno_id", alunoId)
    .eq("turma_id", turmaId)
    .eq("afastado", false)
    .maybeSingle();

  const matricula = matriculaResult.data;
  if (!matricula) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  const { sincronizarBloqueioAluno } = await import("../../lib/inadimplencia.js");
  await sincronizarBloqueioAluno(alunoId);

  const bloqueioResult = await supabase
    .from("MatriculaTurma")
    .select("bloqueado_inadimplencia")
    .eq("aluno_id", alunoId)
    .eq("turma_id", turmaId)
    .single();

  const turma = relOne(matricula.Turma) as {
    id: string;
    nome: string;
    modalidade: string;
    nivel: string;
    local: string | null;
    horario_inicio: string | null;
    horario_fim: string | null;
    mensalidade_centavos: number;
    codigo_convite: string;
    dia_vencimento: number;
    foto_url: string | null;
  };

  const colegasResult = await supabase
    .from("MatriculaTurma")
    .select("numero_camisa, posicao, Aluno(nome, sobrenome)")
    .eq("turma_id", turmaId)
    .eq("afastado", false);

  const colegas = throwOnError(colegasResult).flatMap((m) => {
    const a = relOne(m.Aluno) as { nome: string; sobrenome: string | null } | null;
    if (!a) return [];
    return [
      {
        nome: [a.nome, a.sobrenome].filter(Boolean).join(" "),
        numeroCamisa: m.numero_camisa,
        posicao: m.posicao,
      },
    ];
  });

  return {
    id: turma.id,
    nome: turma.nome,
    modalidade: turma.modalidade,
    nivel: turma.nivel,
    local: turma.local,
    horarioInicio: turma.horario_inicio,
    horarioFim: turma.horario_fim,
    mensalidadeCentavos: turma.mensalidade_centavos,
    codigoConvite: turma.codigo_convite,
    diaVencimento: turma.dia_vencimento,
    fotoUrl: turma.foto_url ?? null,
    numeroCamisa: matricula.numero_camisa,
    posicao: matricula.posicao,
    bloqueadoInadimplencia: bloqueioResult.data?.bloqueado_inadimplencia ?? false,
    alunos: colegas,
  };
}

export async function atualizarMatricula(
  alunoId: string,
  turmaId: string,
  input: UpdateMatriculaInput,
) {
  const matriculaResult = await supabase
    .from("MatriculaTurma")
    .select("id")
    .eq("aluno_id", alunoId)
    .eq("turma_id", turmaId)
    .eq("afastado", false)
    .maybeSingle();

  if (!matriculaResult.data) {
    throw new AppError(404, "NOT_FOUND", "Matrícula não encontrada");
  }

  const patch: Record<string, unknown> = {};
  if (input.numeroCamisa !== undefined) patch.numero_camisa = input.numeroCamisa;
  if (input.posicao !== undefined) patch.posicao = input.posicao;

  const result = await supabase
    .from("MatriculaTurma")
    .update(patch)
    .eq("id", matriculaResult.data.id)
    .select("numero_camisa, posicao")
    .single();

  const updated = throwOnError(result);
  return {
    numeroCamisa: updated.numero_camisa,
    posicao: updated.posicao,
  };
}

export async function afastarAlunoTurma(
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
    .select("id")
    .eq("aluno_id", alunoId)
    .eq("turma_id", turmaId)
    .eq("afastado", false)
    .maybeSingle();

  if (!matriculaResult.data) {
    throw new AppError(404, "NOT_FOUND", "Aluno não está nesta turma");
  }

  throwOnError(
    await supabase
      .from("MatriculaTurma")
      .update({ afastado: true })
      .eq("id", matriculaResult.data.id),
  );

  return { ok: true };
}

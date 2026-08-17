import bcrypt from "bcryptjs";
import {
  execute,
  generateId,
  matricularAlunoTurma,
  now,
  query,
  queryMaybeOne,
  queryOne,
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

type AlunoRow = Record<string, unknown>;
type TurmaRow = Record<string, unknown>;

export async function listarAlunos(professorId: string) {
  const turmaIds = await turmaIdsDoProfessor(professorId);
  if (turmaIds.length === 0) return [];

  const matriculas = await query<{
    aluno_id: string;
    turma_id: string;
    turma_nome: string;
    nome: string;
    sobrenome: string | null;
    telefone: string | null;
    email: string | null;
  }>(
    `SELECT m.aluno_id, t.id AS turma_id, t.nome AS turma_nome,
            a.nome, a.sobrenome, a.telefone, a.email
     FROM "MatriculaTurma" m
     JOIN "Aluno" a ON a.id = m.aluno_id
     JOIN "Turma" t ON t.id = m.turma_id
     WHERE m.turma_id = ANY($1::text[]) AND m.afastado = false`,
    [turmaIds],
  );

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
    const entry = byAluno.get(m.aluno_id) ?? {
      id: m.aluno_id,
      nome: m.nome,
      sobrenome: m.sobrenome,
      telefone: m.telefone,
      email: m.email,
      turmas: [],
    };
    if (!entry.turmas.some((t) => t.id === m.turma_id)) {
      entry.turmas.push({ id: m.turma_id, nome: m.turma_nome });
    }
    byAluno.set(m.aluno_id, entry);
  }

  const result = [];
  for (const aluno of byAluno.values()) {
    const pagamentos = (
      await query<{ status: string; mes_referencia: string; vencimento: string | null }>(
        `SELECT status, mes_referencia, vencimento
         FROM "Pagamento"
         WHERE aluno_id = $1
         ORDER BY mes_referencia DESC`,
        [aluno.id],
      )
    ).filter((p) => !isMesFuturo(p.mes_referencia, hoje));

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
  const aluno = await queryOne<AlunoRow>(
    `SELECT * FROM "Aluno" WHERE id = $1`,
    [id],
    { message: "Aluno não encontrado" },
  );

  if (user.perfil === "ALUNO" && aluno.id !== user.alunoId) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }

  const matriculas = await query<{
    posicao: string | null;
    numero_camisa: number | null;
    bloqueado_inadimplencia: boolean;
    turma_id: string;
    turma_nome: string;
    professor_id: string;
  }>(
    `SELECT m.posicao, m.numero_camisa, m.bloqueado_inadimplencia,
            t.id AS turma_id, t.nome AS turma_nome, t.professor_id
     FROM "MatriculaTurma" m
     JOIN "Turma" t ON t.id = m.turma_id
     WHERE m.aluno_id = $1 AND m.afastado = false`,
    [id],
  );

  if (user.perfil === "PROFESSOR") {
    const owns = matriculas.some((m) => m.professor_id === user.professorId);
    if (!owns) throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }

  const pagamentos = await query<{
    id: string;
    mes_referencia: string;
    valor_centavos: number;
    status: string;
    vencimento: string | null;
  }>(
    `SELECT id, mes_referencia, valor_centavos, status, vencimento
     FROM "Pagamento"
     WHERE aluno_id = $1
     ORDER BY mes_referencia DESC
     LIMIT 12`,
    [id],
  );

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
    turmas: matriculas.map((m) => ({
      id: m.turma_id,
      nome: m.turma_nome,
      numeroCamisa: m.numero_camisa,
      posicao: m.posicao,
      bloqueadoInadimplencia: m.bloqueado_inadimplencia ?? false,
    })),
    mensalidades,
  };
}

export async function adicionarAlunoTurma(
  turmaId: string,
  professorId: string,
  input: CreateAlunoInput,
) {
  const turmaCheck = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "Turma" WHERE id = $1 AND professor_id = $2`,
    [turmaId, professorId],
  );

  if (!turmaCheck) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  let alunoId: string;
  const ts = now();

  if (input.email) {
    const usuario = await queryMaybeOne<{ id: string; aluno_id: string | null }>(
      `SELECT u.id, a.id AS aluno_id
       FROM "Usuario" u
       LEFT JOIN "Aluno" a ON a.usuario_id = u.id
       WHERE u.email = $1`,
      [input.email],
    );

    if (usuario?.aluno_id) {
      alunoId = usuario.aluno_id;
    } else {
      const senha = input.senha ?? Math.random().toString(36).slice(2, 10);
      const senha_hash = await bcrypt.hash(senha, 12);
      const usuarioId = generateId();
      alunoId = generateId();

      await execute(
        `INSERT INTO "Usuario" (id, email, nome, senha_hash, perfil, email_verificado_em, criado_em, atualizado_em)
         VALUES ($1, $2, $3, $4, $5, $6, $6, $6)`,
        [usuarioId, input.email, input.nome, senha_hash, "ALUNO", ts],
      );

      await execute(
        `INSERT INTO "Aluno" (id, usuario_id, nome, email, telefone, criado_em, atualizado_em)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [alunoId, usuarioId, input.nome, input.email, input.telefone, ts, ts],
      );
    }
  } else {
    alunoId = generateId();
    await execute(
      `INSERT INTO "Aluno" (id, nome, telefone, criado_em, atualizado_em)
       VALUES ($1, $2, $3, $4, $5)`,
      [alunoId, input.nome, input.telefone, ts, ts],
    );
  }

  await matricularAlunoTurma(alunoId, turmaId);
  await gerarMensalidadesParaAluno(alunoId, turmaId);

  return queryOne<AlunoRow>(`SELECT * FROM "Aluno" WHERE id = $1`, [alunoId]);
}

export async function previewTurmaPorCodigo(alunoId: string, codigoConvite: string) {
  const codigo = codigoConvite?.trim().toUpperCase() ?? "";
  if (codigo.length < 4) {
    throw new AppError(400, "CONVITE_OBRIGATORIO", "Código da turma é obrigatório");
  }

  const turma = await queryMaybeOne<TurmaRow>(
    `SELECT * FROM "Turma" WHERE UPPER(codigo_convite) = $1`,
    [codigo],
  );

  if (!turma) throw new AppError(404, "CONVITE_INVALIDO", "Código inválido");

  const matricula = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "MatriculaTurma"
     WHERE aluno_id = $1 AND turma_id = $2 AND afastado = false`,
    [alunoId, turma.id],
  );

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
    jaMatriculado: !!matricula,
  };
}

export async function entrarTurma(alunoId: string, codigoConvite: string) {
  const preview = await previewTurmaPorCodigo(alunoId, codigoConvite);
  if (preview.jaMatriculado) {
    throw new AppError(409, "JA_MATRICULADO", "Você já está nesta turma");
  }

  await matricularAlunoTurma(alunoId, preview.id as string);
  await gerarMensalidadesParaAluno(alunoId, preview.id as string);
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

async function assertProfessorPodeAcessarAluno(professorId: string, alunoId: string) {
  const matricula = await queryMaybeOne<{ professor_id: string }>(
    `SELECT t.professor_id
     FROM "MatriculaTurma" m
     JOIN "Turma" t ON t.id = m.turma_id
     WHERE m.aluno_id = $1 AND m.afastado = false AND t.professor_id = $2
     LIMIT 1`,
    [alunoId, professorId],
  );

  if (!matricula) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }
}

export async function atualizarAluno(
  id: string,
  user: { perfil: string; professorId?: string; alunoId?: string },
  input: UpdateAlunoInput,
) {
  if (user.perfil === "ALUNO" && id !== user.alunoId) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }

  if (user.perfil === "PROFESSOR") {
    await assertProfessorPodeAcessarAluno(user.professorId!, id);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const addField = (column: string, value: unknown) => {
    fields.push(`"${column}" = $${idx++}`);
    values.push(value);
  };

  addField("atualizado_em", now());
  if (input.nome !== undefined) addField("nome", input.nome);
  if (input.sobrenome !== undefined) addField("sobrenome", input.sobrenome);
  if (input.telefone !== undefined) addField("telefone", input.telefone.replace(/\D/g, ""));
  if (input.email !== undefined) addField("email", input.email);
  if (input.rg !== undefined) addField("rg", input.rg.trim());
  if (input.cpf !== undefined) addField("cpf", input.cpf?.replace(/\D/g, "") || null);

  values.push(id);

  const aluno = await queryOne<AlunoRow & { usuario_id: string | null }>(
    `UPDATE "Aluno" SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values,
  );

  if (user.perfil === "ALUNO" && (input.nome !== undefined || input.sobrenome !== undefined)) {
    const nomeCompleto = [aluno.nome, aluno.sobrenome].filter(Boolean).join(" ");
    await execute(
      `UPDATE "Usuario" SET nome = $1, atualizado_em = $2 WHERE id = $3`,
      [nomeCompleto, now(), aluno.usuario_id],
    );
  }

  return aluno;
}

export async function listarMinhasTurmas(alunoId: string) {
  const matriculas = await query<{
    numero_camisa: number | null;
    posicao: string | null;
    id: string;
    nome: string;
    modalidade: string;
    local: string | null;
    horario_inicio: string | null;
    horario_fim: string | null;
    mensalidade_centavos: number;
    codigo_convite: string;
    foto_url: string | null;
  }>(
    `SELECT m.numero_camisa, m.posicao,
            t.id, t.nome, t.modalidade, t.local, t.horario_inicio, t.horario_fim,
            t.mensalidade_centavos, t.codigo_convite, t.foto_url
     FROM "MatriculaTurma" m
     JOIN "Turma" t ON t.id = m.turma_id
     WHERE m.aluno_id = $1 AND m.afastado = false`,
    [alunoId],
  );

  return matriculas.map((t) => ({
    id: t.id,
    nome: t.nome,
    modalidade: t.modalidade,
    local: t.local,
    horarioInicio: t.horario_inicio,
    horarioFim: t.horario_fim,
    mensalidadeCentavos: t.mensalidade_centavos,
    codigoConvite: t.codigo_convite,
    fotoUrl: t.foto_url ?? null,
    numeroCamisa: t.numero_camisa,
    posicao: t.posicao,
  }));
}

export async function getMinhaTurma(alunoId: string, turmaId: string) {
  const matricula = await queryMaybeOne<{
    numero_camisa: number | null;
    posicao: string | null;
    bloqueado_inadimplencia: boolean;
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
  }>(
    `SELECT m.numero_camisa, m.posicao, m.bloqueado_inadimplencia,
            t.id, t.nome, t.modalidade, t.nivel, t.local, t.horario_inicio, t.horario_fim,
            t.mensalidade_centavos, t.codigo_convite, t.dia_vencimento, t.foto_url
     FROM "MatriculaTurma" m
     JOIN "Turma" t ON t.id = m.turma_id
     WHERE m.aluno_id = $1 AND m.turma_id = $2 AND m.afastado = false`,
    [alunoId, turmaId],
  );

  if (!matricula) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  const { sincronizarBloqueioAluno } = await import("../../lib/inadimplencia.js");
  await sincronizarBloqueioAluno(alunoId);

  const bloqueio = await queryOne<{ bloqueado_inadimplencia: boolean }>(
    `SELECT bloqueado_inadimplencia FROM "MatriculaTurma"
     WHERE aluno_id = $1 AND turma_id = $2`,
    [alunoId, turmaId],
  );

  const colegas = await query<{
    numero_camisa: number | null;
    posicao: string | null;
    nome: string;
    sobrenome: string | null;
  }>(
    `SELECT m.numero_camisa, m.posicao, a.nome, a.sobrenome
     FROM "MatriculaTurma" m
     JOIN "Aluno" a ON a.id = m.aluno_id
     WHERE m.turma_id = $1 AND m.afastado = false`,
    [turmaId],
  );

  return {
    id: matricula.id,
    nome: matricula.nome,
    modalidade: matricula.modalidade,
    nivel: matricula.nivel,
    local: matricula.local,
    horarioInicio: matricula.horario_inicio,
    horarioFim: matricula.horario_fim,
    mensalidadeCentavos: matricula.mensalidade_centavos,
    codigoConvite: matricula.codigo_convite,
    diaVencimento: matricula.dia_vencimento,
    fotoUrl: matricula.foto_url ?? null,
    numeroCamisa: matricula.numero_camisa,
    posicao: matricula.posicao,
    bloqueadoInadimplencia: bloqueio.bloqueado_inadimplencia ?? false,
    alunos: colegas.map((a) => ({
      nome: [a.nome, a.sobrenome].filter(Boolean).join(" "),
      numeroCamisa: a.numero_camisa,
      posicao: a.posicao,
    })),
  };
}

export async function atualizarMatricula(
  alunoId: string,
  turmaId: string,
  input: UpdateMatriculaInput,
) {
  const matricula = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "MatriculaTurma"
     WHERE aluno_id = $1 AND turma_id = $2 AND afastado = false`,
    [alunoId, turmaId],
  );

  if (!matricula) {
    throw new AppError(404, "NOT_FOUND", "Matrícula não encontrada");
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.numeroCamisa !== undefined) {
    fields.push(`numero_camisa = $${idx++}`);
    values.push(input.numeroCamisa);
  }
  if (input.posicao !== undefined) {
    fields.push(`posicao = $${idx++}`);
    values.push(input.posicao);
  }

  values.push(matricula.id);

  const updated = await queryOne<{ numero_camisa: number | null; posicao: string | null }>(
    `UPDATE "MatriculaTurma" SET ${fields.join(", ")} WHERE id = $${idx}
     RETURNING numero_camisa, posicao`,
    values,
  );

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
  const turmaCheck = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "Turma" WHERE id = $1 AND professor_id = $2`,
    [turmaId, professorId],
  );

  if (!turmaCheck) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  const matricula = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "MatriculaTurma"
     WHERE aluno_id = $1 AND turma_id = $2 AND afastado = false`,
    [alunoId, turmaId],
  );

  if (!matricula) {
    throw new AppError(404, "NOT_FOUND", "Aluno não está nesta turma");
  }

  await execute(
    `UPDATE "MatriculaTurma" SET afastado = true WHERE id = $1`,
    [matricula.id],
  );

  return { ok: true };
}

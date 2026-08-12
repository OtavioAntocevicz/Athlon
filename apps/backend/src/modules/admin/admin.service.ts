import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import {
  countQuery,
  execute,
  generateId,
  matricularAlunoTurma,
  now,
  query,
  queryMaybeOne,
} from "../../lib/db.js";
import { removerArquivoStorage } from "../../lib/storage/index.js";
import { AppError } from "../../middleware/error-handler.js";
import type {
  CreateProfessorAdminInput,
  UpdateProfessorStatusInput,
} from "@athlon/shared-types";
import { listarAlunos } from "../alunos/alunos.service.js";
import { statusEfetivo } from "../../lib/mensalidade-focus.js";
import { isMesFuturo } from "../../lib/utils.js";
import { gerarMensalidadesParaAluno } from "../mensalidades/mensalidades.service.js";
import { excluirTurmaCascade } from "../turmas/turmas.service.js";
import { createProfessorPasswordInvite } from "../../lib/password-invite.js";
import { sendProfessorWelcomeEmail } from "../../lib/email.js";
import { env } from "../../config/env.js";

const BCRYPT_ROUNDS = 12;

type ProfessorRow = {
  id: string;
  usuario_id: string;
  chave_pix: string | null;
  criado_em: string;
  usuario_nome: string;
  usuario_email: string;
  usuario_ativo: boolean;
  usuario_criado_em: string;
};

async function countAlunosAtivosPorProfessor(professorId: string): Promise<number> {
  const turmaIds = (
    await query<{ id: string }>(
      `SELECT id FROM "Turma" WHERE professor_id = $1`,
      [professorId],
    )
  ).map((t) => t.id);

  if (turmaIds.length === 0) return 0;

  const matriculas = await query<{ aluno_id: string }>(
    `SELECT aluno_id FROM "MatriculaTurma"
     WHERE turma_id = ANY($1::text[]) AND afastado = false`,
    [turmaIds],
  );

  return new Set(matriculas.map((m) => m.aluno_id)).size;
}

async function buildProfessorResumo(prof: ProfessorRow) {
  const turmasCount = await countQuery(
    `SELECT COUNT(*)::text AS count FROM "Turma" WHERE professor_id = $1`,
    [prof.id],
  );

  const totalAlunos = await countAlunosAtivosPorProfessor(prof.id);

  return {
    id: prof.id,
    usuarioId: prof.usuario_id,
    nome: prof.usuario_nome,
    email: prof.usuario_email,
    ativo: prof.usuario_ativo,
    totalTurmas: turmasCount,
    totalAlunos,
    criadoEm: new Date(prof.usuario_criado_em).toISOString(),
  };
}

export async function getDashboard() {
  const professoresAtivos = await countQuery(
    `SELECT COUNT(*)::text AS count FROM "Usuario"
     WHERE perfil = 'PROFESSOR' AND ativo = true`,
  );

  const professorIds = (
    await query<{ id: string }>(
      `SELECT p.id
       FROM "Professor" p
       JOIN "Usuario" u ON u.id = p.usuario_id
       WHERE u.ativo = true`,
    )
  ).map((p) => p.id);

  let totalTurmas = 0;
  if (professorIds.length > 0) {
    totalTurmas = await countQuery(
      `SELECT COUNT(*)::text AS count FROM "Turma"
       WHERE professor_id = ANY($1::text[])`,
      [professorIds],
    );
  }

  let totalAlunos = 0;
  if (professorIds.length > 0) {
    const turmaIds = (
      await query<{ id: string }>(
        `SELECT id FROM "Turma" WHERE professor_id = ANY($1::text[])`,
        [professorIds],
      )
    ).map((t) => t.id);

    if (turmaIds.length > 0) {
      const matriculas = await query<{ aluno_id: string }>(
        `SELECT aluno_id FROM "MatriculaTurma"
         WHERE turma_id = ANY($1::text[]) AND afastado = false`,
        [turmaIds],
      );
      totalAlunos = new Set(matriculas.map((m) => m.aluno_id)).size;
    }
  }

  const alunoIdsComConta = (
    await query<{ id: string }>(
      `SELECT id FROM "Aluno" WHERE usuario_id IS NOT NULL`,
    )
  ).map((a) => a.id);

  let alunosSemTurma = 0;
  if (alunoIdsComConta.length > 0) {
    const matriculasAtivas = await query<{ aluno_id: string }>(
      `SELECT aluno_id FROM "MatriculaTurma"
       WHERE aluno_id = ANY($1::text[]) AND afastado = false`,
      [alunoIdsComConta],
    );
    const comTurma = new Set(matriculasAtivas.map((m) => m.aluno_id));
    alunosSemTurma = alunoIdsComConta.filter((id) => !comTurma.has(id)).length;
  }

  const professores = await listarProfessores();

  return {
    professoresAtivos,
    totalTurmas,
    totalAlunos,
    alunosSemTurma,
    professores,
  };
}

export async function listarProfessores(filtros?: { busca?: string; ativo?: boolean }) {
  const params: unknown[] = [];
  let whereClause = "";

  if (filtros?.ativo !== undefined) {
    params.push(filtros.ativo);
    whereClause = `WHERE u.ativo = $${params.length}`;
  }

  const rows = await query<ProfessorRow>(
    `SELECT p.id, p.usuario_id, p.chave_pix, p.criado_em,
            u.nome AS usuario_nome, u.email AS usuario_email,
            u.ativo AS usuario_ativo, u.criado_em AS usuario_criado_em
     FROM "Professor" p
     JOIN "Usuario" u ON u.id = p.usuario_id
     ${whereClause}
     ORDER BY p.criado_em DESC`,
    params,
  );

  const items = [];
  for (const row of rows) {
    const resumo = await buildProfessorResumo(row);

    if (filtros?.busca) {
      const termo = filtros.busca.toLowerCase();
      const match =
        resumo.nome.toLowerCase().includes(termo) ||
        resumo.email.toLowerCase().includes(termo);
      if (!match) continue;
    }

    items.push(resumo);
  }

  return items;
}

async function enviarConviteProfessor(input: {
  usuarioId: string;
  nome: string;
  email: string;
}) {
  const { link } = await createProfessorPasswordInvite(input.usuarioId);

  try {
    await sendProfessorWelcomeEmail({
      to: input.email,
      nome: input.nome,
      link,
    });
    return { conviteEnviado: true, conviteLink: env.recoveryShowCode ? link : undefined };
  } catch (err) {
    console.error("[admin] Falha ao enviar convite de professor:", err);
    if (env.recoveryShowCode) {
      return { conviteEnviado: false, conviteLink: link };
    }
    return { conviteEnviado: false };
  }
}

export async function criarProfessor(input: CreateProfessorAdminInput) {
  const exists = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "Usuario" WHERE email = $1`,
    [input.email],
  );

  if (exists) {
    throw new AppError(409, "EMAIL_EXISTS", "E-mail já cadastrado");
  }

  const senhaTemporaria = randomBytes(32).toString("hex");
  const senha_hash = await bcrypt.hash(senhaTemporaria, BCRYPT_ROUNDS);
  const usuarioId = generateId();
  const professorId = generateId();
  const ts = now();

  await execute(
    `INSERT INTO "Usuario"
       (id, email, nome, senha_hash, perfil, ativo, email_verificado_em, criado_em, atualizado_em)
     VALUES ($1, $2, $3, $4, 'PROFESSOR', true, $5, $5, $5)`,
    [usuarioId, input.email, input.nome, senha_hash, ts],
  );

  await execute(
    `INSERT INTO "Professor"
       (id, usuario_id, chave_pix, criado_em, atualizado_em)
     VALUES ($1, $2, $3, $4, $4)`,
    [professorId, usuarioId, input.chavePix, ts],
  );

  const convite = await enviarConviteProfessor({
    usuarioId,
    nome: input.nome,
    email: input.email,
  });

  return {
    id: professorId,
    usuarioId,
    nome: input.nome,
    email: input.email,
    conviteEnviado: convite.conviteEnviado,
    ...(convite.conviteLink ? { conviteLink: convite.conviteLink } : {}),
  };
}

export async function reenviarConviteProfessor(professorId: string) {
  const prof = await queryMaybeOne<{
    id: string;
    usuario_id: string;
    usuario_nome: string;
    usuario_email: string;
    usuario_ativo: boolean;
  }>(
    `SELECT p.id, p.usuario_id,
            u.nome AS usuario_nome, u.email AS usuario_email, u.ativo AS usuario_ativo
     FROM "Professor" p
     JOIN "Usuario" u ON u.id = p.usuario_id
     WHERE p.id = $1`,
    [professorId],
  );

  if (!prof) {
    throw new AppError(404, "NOT_FOUND", "Professor não encontrado");
  }

  if (!prof.usuario_ativo) {
    throw new AppError(400, "PROFESSOR_INATIVO", "Reative o professor antes de reenviar o convite.");
  }

  const convite = await enviarConviteProfessor({
    usuarioId: prof.usuario_id,
    nome: prof.usuario_nome,
    email: prof.usuario_email,
  });

  return {
    ok: true as const,
    message: convite.conviteEnviado
      ? "Convite reenviado por e-mail."
      : env.recoveryShowCode
        ? "E-mail indisponível. Use o link abaixo (modo dev)."
        : "Não foi possível enviar o e-mail. Tente novamente mais tarde.",
    ...(convite.conviteLink ? { conviteLink: convite.conviteLink } : {}),
  };
}

export async function obterProfessor(professorId: string) {
  const prof = await queryMaybeOne<ProfessorRow>(
    `SELECT p.id, p.usuario_id, p.chave_pix, p.criado_em,
            u.nome AS usuario_nome, u.email AS usuario_email,
            u.ativo AS usuario_ativo, u.criado_em AS usuario_criado_em
     FROM "Professor" p
     JOIN "Usuario" u ON u.id = p.usuario_id
     WHERE p.id = $1`,
    [professorId],
  );

  if (!prof) {
    throw new AppError(404, "NOT_FOUND", "Professor não encontrado");
  }

  const turmas = await query<{
    id: string;
    nome: string;
    modalidade: string;
    codigo_convite: string;
    criado_em: string;
  }>(
    `SELECT id, nome, modalidade, codigo_convite, criado_em
     FROM "Turma"
     WHERE professor_id = $1
     ORDER BY criado_em DESC`,
    [professorId],
  );

  const turmasResumo = [];
  for (const t of turmas) {
    const totalAlunos = await countQuery(
      `SELECT COUNT(*)::text AS count FROM "MatriculaTurma"
       WHERE turma_id = $1 AND afastado = false`,
      [t.id],
    );

    turmasResumo.push({
      id: t.id,
      nome: t.nome,
      modalidade: t.modalidade,
      totalAlunos,
      codigoConvite: t.codigo_convite,
      criadoEm: new Date(t.criado_em).toISOString(),
    });
  }

  const alunos = await listarAlunos(professorId);

  return {
    id: prof.id,
    usuarioId: prof.usuario_id,
    nome: prof.usuario_nome,
    email: prof.usuario_email,
    chavePix: prof.chave_pix,
    ativo: prof.usuario_ativo,
    criadoEm: new Date(prof.usuario_criado_em).toISOString(),
    totalTurmas: turmasResumo.length,
    totalAlunos: alunos.length,
    turmas: turmasResumo,
    alunos: alunos.map((a) => ({
      id: a.id,
      nome: a.nome,
      telefone: a.telefone,
      email: a.email,
      turmas: a.turmas,
      statusFinanceiro: a.statusFinanceiro,
    })),
  };
}

export async function atualizarStatusProfessor(
  professorId: string,
  input: UpdateProfessorStatusInput,
) {
  const prof = await queryMaybeOne<{ usuario_id: string }>(
    `SELECT usuario_id FROM "Professor" WHERE id = $1`,
    [professorId],
  );

  if (!prof) {
    throw new AppError(404, "NOT_FOUND", "Professor não encontrado");
  }

  await execute(
    `UPDATE "Usuario" SET ativo = $1, atualizado_em = $2 WHERE id = $3`,
    [input.ativo, now(), prof.usuario_id],
  );

  return { ok: true, ativo: input.ativo };
}

/**
 * Exclusão definitiva da conta do professor.
 * Remove turmas e dados vinculados às turmas; alunos do sistema são preservados.
 */
export async function excluirProfessorAdmin(professorId: string) {
  const prof = await queryMaybeOne<{
    id: string;
    usuario_id: string;
    nome: string;
  }>(
    `SELECT p.id, p.usuario_id, u.nome
     FROM "Professor" p
     INNER JOIN "Usuario" u ON u.id = p.usuario_id
     WHERE p.id = $1`,
    [professorId],
  );

  if (!prof) {
    throw new AppError(404, "NOT_FOUND", "Professor não encontrado");
  }

  const turmas = await query<{ id: string }>(
    `SELECT id FROM "Turma" WHERE professor_id = $1`,
    [professorId],
  );

  for (const turma of turmas) {
    await excluirTurmaCascade(turma.id);
  }

  await execute(`DELETE FROM "Professor" WHERE id = $1`, [professorId]);
  await execute(`DELETE FROM "Usuario" WHERE id = $1 AND perfil = 'PROFESSOR'`, [
    prof.usuario_id,
  ]);

  return { ok: true as const, nome: prof.nome, turmasExcluidas: turmas.length };
}

/**
 * Exclusão definitiva da conta/cadastro do aluno e dados financeiros vinculados.
 */
export async function excluirAlunoAdmin(alunoId: string) {
  const aluno = await queryMaybeOne<{
    id: string;
    usuario_id: string | null;
    nome: string;
  }>(`SELECT id, usuario_id, nome FROM "Aluno" WHERE id = $1`, [alunoId]);

  if (!aluno) {
    throw new AppError(404, "NOT_FOUND", "Aluno não encontrado");
  }

  const comprovantes = await query<{ arquivo_url: string | null }>(
    `SELECT c.arquivo_url
     FROM "Comprovante" c
     INNER JOIN "Pagamento" p ON p.id = c.pagamento_id
     WHERE p.aluno_id = $1`,
    [alunoId],
  );

  for (const c of comprovantes) {
    try {
      await removerArquivoStorage(c.arquivo_url);
    } catch {
      /* ignora falha de storage */
    }
  }

  await execute(`DELETE FROM "Aluno" WHERE id = $1`, [alunoId]);

  if (aluno.usuario_id) {
    await execute(`DELETE FROM "Usuario" WHERE id = $1 AND perfil = 'ALUNO'`, [
      aluno.usuario_id,
    ]);
  }

  return { ok: true as const, nome: aluno.nome };
}

async function statusFinanceiroAluno(alunoId: string): Promise<string> {
  const hoje = new Date();
  const pagamentos = (
    await query<{
      status: string;
      mes_referencia: string;
      vencimento: string | null;
    }>(
      `SELECT status, mes_referencia, vencimento
       FROM "Pagamento"
       WHERE aluno_id = $1
       ORDER BY mes_referencia DESC`,
      [alunoId],
    )
  ).filter((p) => !isMesFuturo(p.mes_referencia, hoje));

  const ultimo = pagamentos[0];
  return ultimo ? statusEfetivo(ultimo, hoje) : "PENDENTE";
}

export async function listarAlunosAdmin(filtros?: {
  busca?: string;
  semTurma?: boolean;
}) {
  const alunos = await query<{
    id: string;
    nome: string;
    sobrenome: string | null;
    email: string | null;
    telefone: string | null;
    cpf: string | null;
    rg: string | null;
  }>(
    `SELECT id, nome, sobrenome, email, telefone, cpf, rg
     FROM "Aluno"
     ORDER BY nome ASC`,
  );

  const matriculas = await query<{
    aluno_id: string;
    turma_id: string;
    turma_nome: string;
  }>(
    `SELECT mt.aluno_id, t.id AS turma_id, t.nome AS turma_nome
     FROM "MatriculaTurma" mt
     JOIN "Turma" t ON t.id = mt.turma_id
     WHERE mt.afastado = false`,
  );

  const turmasPorAluno = new Map<string, { id: string; nome: string }[]>();

  for (const m of matriculas) {
    const list = turmasPorAluno.get(m.aluno_id) ?? [];
    if (!list.some((t) => t.id === m.turma_id)) {
      list.push({ id: m.turma_id, nome: m.turma_nome });
    }
    turmasPorAluno.set(m.aluno_id, list);
  }

  const termo = filtros?.busca?.trim().toLowerCase() ?? "";
  const termoDigits = termo.replace(/\D/g, "");

  const items = [];
  for (const aluno of alunos) {
    const turmas = turmasPorAluno.get(aluno.id) ?? [];
    const semTurma = turmas.length === 0;

    if (filtros?.semTurma && !semTurma) continue;

    const nomeCompleto = [aluno.nome, aluno.sobrenome].filter(Boolean).join(" ");

    if (termo) {
      const email = (aluno.email ?? "").toLowerCase();
      const cpf = (aluno.cpf ?? "").replace(/\D/g, "");
      const rg = (aluno.rg ?? "").replace(/\D/g, "");
      const matchTexto =
        nomeCompleto.toLowerCase().includes(termo) ||
        email.includes(termo) ||
        (termoDigits.length > 0 && (cpf.includes(termoDigits) || rg.includes(termoDigits)));
      if (!matchTexto) continue;
    }

    items.push({
      id: aluno.id,
      nome: nomeCompleto,
      email: aluno.email,
      telefone: aluno.telefone,
      cpf: aluno.cpf,
      rg: aluno.rg,
      turmas,
      statusFinanceiro: await statusFinanceiroAluno(aluno.id),
      semTurma,
    });
  }

  return items.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function obterTurmaAdmin(turmaId: string) {
  const turma = await queryMaybeOne<{
    id: string;
    nome: string;
    modalidade: string;
    nivel: string;
    codigo_convite: string;
    local: string | null;
    horario_inicio: string | null;
    horario_fim: string | null;
    mensalidade_centavos: number | null;
    dia_vencimento: number | null;
    foto_url: string | null;
    criado_em: string;
    professor_id: string;
    professor_row_id: string;
    professor_nome: string;
  }>(
    `SELECT t.id, t.nome, t.modalidade, t.nivel, t.codigo_convite, t.local,
            t.horario_inicio, t.horario_fim, t.mensalidade_centavos, t.dia_vencimento,
            t.foto_url, t.criado_em, t.professor_id,
            pr.id AS professor_row_id, u.nome AS professor_nome
     FROM "Turma" t
     JOIN "Professor" pr ON pr.id = t.professor_id
     JOIN "Usuario" u ON u.id = pr.usuario_id
     WHERE t.id = $1`,
    [turmaId],
  );

  if (!turma) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  const alunosDoProfessor = await listarAlunos(turma.professor_id);
  const alunos = alunosDoProfessor
    .filter((a) => a.turmas.some((t) => t.id === turmaId))
    .map((a) => ({
      id: a.id,
      nome: a.nome,
      telefone: a.telefone,
      email: a.email,
      turmas: a.turmas.filter((t) => t.id === turmaId),
      statusFinanceiro: a.statusFinanceiro,
    }));

  return {
    id: turma.id,
    nome: turma.nome,
    modalidade: turma.modalidade,
    nivel: turma.nivel,
    codigoConvite: turma.codigo_convite,
    local: turma.local,
    horarioInicio: turma.horario_inicio,
    horarioFim: turma.horario_fim,
    mensalidadeCentavos: turma.mensalidade_centavos,
    diaVencimento: turma.dia_vencimento,
    fotoUrl: turma.foto_url ?? null,
    criadoEm: new Date(turma.criado_em).toISOString(),
    professor: {
      id: turma.professor_row_id,
      nome: turma.professor_nome,
    },
    totalAlunos: alunos.length,
    alunos,
  };
}

export async function obterAlunoAdmin(alunoId: string) {
  const aluno = await queryMaybeOne<{
    id: string;
    nome: string;
    sobrenome: string | null;
    telefone: string | null;
    email: string | null;
    rg: string | null;
    cpf: string | null;
    criado_em: string;
    conta_criada_em: string | null;
  }>(
    `SELECT a.id, a.nome, a.sobrenome, a.telefone, a.email, a.rg, a.cpf, a.criado_em,
            u.criado_em AS conta_criada_em
     FROM "Aluno" a
     LEFT JOIN "Usuario" u ON u.id = a.usuario_id
     WHERE a.id = $1`,
    [alunoId],
  );

  if (!aluno) {
    throw new AppError(404, "NOT_FOUND", "Aluno não encontrado");
  }

  const matriculas = await query<{
    posicao: string | null;
    numero_camisa: number | null;
    bloqueado_inadimplencia: boolean;
    matriculado_em: string;
    turma_id: string;
    turma_nome: string;
    professor_id: string;
    professor_row_id: string;
    professor_nome: string;
  }>(
    `SELECT mt.posicao, mt.numero_camisa, mt.bloqueado_inadimplencia, mt.matriculado_em,
            t.id AS turma_id, t.nome AS turma_nome, t.professor_id,
            pr.id AS professor_row_id, u.nome AS professor_nome
     FROM "MatriculaTurma" mt
     JOIN "Turma" t ON t.id = mt.turma_id
     JOIN "Professor" pr ON pr.id = t.professor_id
     JOIN "Usuario" u ON u.id = pr.usuario_id
     WHERE mt.aluno_id = $1 AND mt.afastado = false`,
    [alunoId],
  );

  const turmas = matriculas.map((m) => ({
    id: m.turma_id,
    nome: m.turma_nome,
    professorId: m.professor_row_id,
    professorNome: m.professor_nome,
    numeroCamisa: m.numero_camisa,
    posicao: m.posicao,
    bloqueadoInadimplencia: m.bloqueado_inadimplencia ?? false,
    matriculadoEm: new Date(m.matriculado_em).toISOString(),
  }));

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
    [alunoId],
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
    criadoEm: new Date(aluno.criado_em).toISOString(),
    contaCriadaEm: aluno.conta_criada_em
      ? new Date(aluno.conta_criada_em).toISOString()
      : null,
    turmas,
    mensalidades,
  };
}

export async function listarTurmasAdmin(busca?: string) {
  const turmas = await query<{
    id: string;
    nome: string;
    modalidade: string;
    codigo_convite: string;
    professor_id: string;
    professor_row_id: string;
    professor_nome: string;
  }>(
    `SELECT t.id, t.nome, t.modalidade, t.codigo_convite, t.professor_id,
            pr.id AS professor_row_id, u.nome AS professor_nome
     FROM "Turma" t
     JOIN "Professor" pr ON pr.id = t.professor_id
     JOIN "Usuario" u ON u.id = pr.usuario_id
     ORDER BY t.nome ASC`,
  );

  const termo = busca?.trim().toLowerCase() ?? "";
  const items = [];

  for (const t of turmas) {
    const professorNome = t.professor_nome;

    if (
      termo &&
      !t.nome.toLowerCase().includes(termo) &&
      !professorNome.toLowerCase().includes(termo) &&
      !t.codigo_convite.toLowerCase().includes(termo)
    ) {
      continue;
    }

    const totalAlunos = await countQuery(
      `SELECT COUNT(*)::text AS count FROM "MatriculaTurma"
       WHERE turma_id = $1 AND afastado = false`,
      [t.id],
    );

    items.push({
      id: t.id,
      nome: t.nome,
      modalidade: t.modalidade,
      professorId: t.professor_row_id,
      professorNome,
      totalAlunos,
      codigoConvite: t.codigo_convite,
    });
  }

  return items;
}

export async function listarBloqueiosAdmin() {
  const rows = await query<{
    aluno_id: string;
    aluno_nome: string;
    aluno_sobrenome: string | null;
    turma_id: string;
    turma_nome: string;
    professor_nome: string;
  }>(
    `SELECT a.id AS aluno_id, a.nome AS aluno_nome, a.sobrenome AS aluno_sobrenome,
            t.id AS turma_id, t.nome AS turma_nome, u.nome AS professor_nome
     FROM "MatriculaTurma" mt
     JOIN "Aluno" a ON a.id = mt.aluno_id
     JOIN "Turma" t ON t.id = mt.turma_id
     JOIN "Professor" pr ON pr.id = t.professor_id
     JOIN "Usuario" u ON u.id = pr.usuario_id
     WHERE mt.afastado = false AND mt.bloqueado_inadimplencia = true`,
  );

  return rows.map((m) => ({
    alunoId: m.aluno_id,
    alunoNome: [m.aluno_nome, m.aluno_sobrenome].filter(Boolean).join(" "),
    turmaId: m.turma_id,
    turmaNome: m.turma_nome,
    professorNome: m.professor_nome,
  }));
}

export async function matricularAlunoAdmin(alunoId: string, turmaId: string) {
  const aluno = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "Aluno" WHERE id = $1`,
    [alunoId],
  );
  if (!aluno) throw new AppError(404, "NOT_FOUND", "Aluno não encontrado");

  const turma = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "Turma" WHERE id = $1`,
    [turmaId],
  );
  if (!turma) throw new AppError(404, "NOT_FOUND", "Turma não encontrada");

  const ativa = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "MatriculaTurma"
     WHERE aluno_id = $1 AND turma_id = $2 AND afastado = false`,
    [alunoId, turmaId],
  );

  if (ativa) {
    throw new AppError(409, "JA_MATRICULADO", "Aluno já está nesta turma");
  }

  await matricularAlunoTurma(alunoId, turmaId);
  await gerarMensalidadesParaAluno(alunoId, turmaId);
  return { ok: true };
}

export async function afastarAlunoAdmin(alunoId: string, turmaId: string) {
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

export async function trocarTurmaAdmin(
  alunoId: string,
  turmaOrigemId: string,
  turmaDestinoId: string,
) {
  if (turmaOrigemId === turmaDestinoId) {
    throw new AppError(400, "MESMA_TURMA", "Origem e destino devem ser diferentes");
  }

  await afastarAlunoAdmin(alunoId, turmaOrigemId);
  await matricularAlunoAdmin(alunoId, turmaDestinoId);
  return { ok: true };
}

export async function desbloquearAlunoAdmin(alunoId: string, turmaId: string) {
  const matricula = await queryMaybeOne<{
    id: string;
    bloqueado_inadimplencia: boolean;
  }>(
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

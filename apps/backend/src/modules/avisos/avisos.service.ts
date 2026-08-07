import { execute, generateId, now, query, queryMaybeOne } from "../../lib/db.js";
import { AppError } from "../../middleware/error-handler.js";
import { criarNotificacao, usuarioIdDoAluno } from "../../lib/notificacoes.js";
import type { CriarAvisoInput } from "@athlon/shared-types";

async function enviarAvisoParaTurma(
  turmaId: string,
  professorId: string,
  titulo: string,
  descricao: string,
) {
  const prof = await queryMaybeOne<{ nome: string }>(
    `SELECT u.nome
     FROM "Professor" p
     JOIN "Usuario" u ON u.id = p.usuario_id
     WHERE p.id = $1`,
    [professorId],
  );
  const nome = prof?.nome ?? "Seu professor";

  const matriculas = await query<{ aluno_id: string }>(
    `SELECT aluno_id FROM "MatriculaTurma"
     WHERE turma_id = $1 AND afastado = false`,
    [turmaId],
  );

  for (const m of matriculas) {
    const usuarioId = await usuarioIdDoAluno(m.aluno_id);
    if (!usuarioId) continue;
    await criarNotificacao(
      usuarioId,
      "Novo aviso da sua turma",
      `Professor ${nome} enviou um novo comunicado.`,
      "AVISO_PROFESSOR",
      "/",
    );
  }
}

export async function criarAviso(professorId: string, input: CriarAvisoInput) {
  const turma = await queryMaybeOne<{ id: string; nome: string }>(
    `SELECT id, nome FROM "Turma"
     WHERE id = $1 AND professor_id = $2`,
    [input.turmaId, professorId],
  );

  if (!turma) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  const id = generateId();
  const ts = now();
  const agendadoPara = input.agendadoPara ? new Date(input.agendadoPara) : null;

  if (agendadoPara && agendadoPara.getTime() <= Date.now()) {
    throw new AppError(400, "DATA_INVALIDA", "Data de agendamento deve ser no futuro");
  }

  const enviarAgora = !agendadoPara;

  await execute(
    `INSERT INTO "AvisoProfessor"
       (id, professor_id, turma_id, titulo, descricao, agendado_para, enviado_em, criado_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      professorId,
      input.turmaId,
      input.titulo,
      input.descricao,
      agendadoPara?.toISOString() ?? null,
      enviarAgora ? ts : null,
      ts,
    ],
  );

  if (enviarAgora) {
    await enviarAvisoParaTurma(input.turmaId, professorId, input.titulo, input.descricao);
  }

  return {
    id,
    titulo: input.titulo,
    turmaNome: turma.nome,
    agendadoPara: agendadoPara?.toISOString() ?? null,
    enviadoEm: enviarAgora ? new Date(ts).toISOString() : null,
  };
}

export async function listarAvisos(professorId: string) {
  const avisos = await query<{
    id: string;
    titulo: string;
    descricao: string;
    turma_id: string;
    turma_nome: string;
    agendado_para: string | null;
    enviado_em: string | null;
    criado_em: string;
  }>(
    `SELECT a.id, a.titulo, a.descricao, a.turma_id, a.agendado_para, a.enviado_em, a.criado_em,
            t.nome AS turma_nome
     FROM "AvisoProfessor" a
     JOIN "Turma" t ON t.id = a.turma_id
     WHERE a.professor_id = $1
     ORDER BY a.criado_em DESC
     LIMIT 50`,
    [professorId],
  );

  return avisos.map((a) => ({
    id: a.id,
    titulo: a.titulo,
    descricao: a.descricao,
    turmaId: a.turma_id,
    turmaNome: a.turma_nome,
    agendadoPara: a.agendado_para ? new Date(a.agendado_para).toISOString() : null,
    enviadoEm: a.enviado_em ? new Date(a.enviado_em).toISOString() : null,
    criadoEm: new Date(a.criado_em).toISOString(),
    status: a.enviado_em ? "ENVIADO" : "AGENDADO",
  }));
}

export async function processarAvisosAgendados() {
  const agora = new Date().toISOString();
  const pendentes = await query<{
    id: string;
    turma_id: string;
    professor_id: string;
    titulo: string;
    descricao: string;
  }>(
    `SELECT id, turma_id, professor_id, titulo, descricao
     FROM "AvisoProfessor"
     WHERE enviado_em IS NULL
       AND agendado_para IS NOT NULL
       AND agendado_para <= $1`,
    [agora],
  );

  for (const aviso of pendentes) {
    await enviarAvisoParaTurma(
      aviso.turma_id,
      aviso.professor_id,
      aviso.titulo,
      aviso.descricao,
    );
    await execute(
      `UPDATE "AvisoProfessor" SET enviado_em = $1 WHERE id = $2`,
      [now(), aviso.id],
    );
  }
}

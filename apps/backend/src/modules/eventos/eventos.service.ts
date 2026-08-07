import {
  execute,
  generateId,
  now,
  query,
  queryMaybeOne,
  queryOne,
  turmaIdsDoProfessor,
} from "../../lib/db.js";
import { AppError } from "../../middleware/error-handler.js";
import { criarNotificacao, usuarioIdDoAluno } from "../../lib/notificacoes.js";
import { TipoEvento, type AtualizarEventoInput, type CriarEventoInput } from "@athlon/shared-types";

type EventoRow = {
  id: string;
  turma_id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  adversario: string | null;
  local: string | null;
  inicio: string;
  fim: string | null;
  ativo: boolean;
  turma_nome?: string;
};

function labelTipoEvento(tipo: string): string {
  return tipo === TipoEvento.CAMPEONATO ? "Campeonato" : "Amistoso";
}

function gerarTituloEvento(tipo: string, adversario?: string | null, titulo?: string): string {
  if (titulo?.trim()) return titulo.trim();
  const label = labelTipoEvento(tipo);
  if (adversario?.trim()) {
    return tipo === TipoEvento.CAMPEONATO
      ? `${label} - ${adversario.trim()}`
      : `${label} vs ${adversario.trim()}`;
  }
  return label;
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapEvento(e: EventoRow, turmaNome?: string) {
  const turma = turmaNome ?? e.turma_nome ?? "";
  return {
    id: e.id,
    turmaId: e.turma_id,
    turmaNome: turma,
    tipo: e.tipo,
    titulo: e.titulo,
    adversario: e.adversario,
    descricao: e.descricao,
    local: e.local,
    inicio: new Date(e.inicio).toISOString(),
    fim: e.fim ? new Date(e.fim).toISOString() : null,
    passado: new Date(e.inicio).getTime() < Date.now(),
  };
}

function ordenarEventosPorInicioAsc<T extends { inicio: string }>(eventos: T[]): T[] {
  return [...eventos].sort(
    (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
  );
}

function filtrarEventosFuturos<T extends { inicio: string }>(eventos: T[]): T[] {
  const agora = Date.now();
  return eventos.filter((e) => new Date(e.inicio).getTime() >= agora);
}

async function assertTurmaDoProfessor(turmaId: string, professorId: string) {
  const turma = await queryMaybeOne<{ id: string; nome: string }>(
    `SELECT id, nome FROM "Turma" WHERE id = $1 AND professor_id = $2`,
    [turmaId, professorId],
  );

  if (!turma) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  return turma;
}

async function assertEventoDoProfessor(eventoId: string, turmaId: string, professorId: string) {
  const evento = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "Evento" WHERE id = $1 AND turma_id = $2 AND ativo = true`,
    [eventoId, turmaId],
  );

  if (!evento) {
    throw new AppError(404, "NOT_FOUND", "Evento não encontrado");
  }

  await assertTurmaDoProfessor(turmaId, professorId);
}

async function notificarEventoParaTurma(
  turmaId: string,
  turmaNome: string,
  evento: { tipo: string; titulo: string; inicio: string; local: string | null },
) {
  const tipoLabel = labelTipoEvento(evento.tipo);
  const dataLabel = formatarDataHora(evento.inicio);
  const localLabel = evento.local ? ` · ${evento.local}` : "";

  const matriculas = await query<{ aluno_id: string }>(
    `SELECT aluno_id FROM "MatriculaTurma" WHERE turma_id = $1 AND afastado = false`,
    [turmaId],
  );

  for (const m of matriculas) {
    const usuarioId = await usuarioIdDoAluno(m.aluno_id);
    if (!usuarioId) continue;
    await criarNotificacao(
      usuarioId,
      `Novo ${tipoLabel} da turma`,
      `${turmaNome} · ${dataLabel}${localLabel}`,
      "EVENTO_TURMA",
      `/minhas-turmas/${turmaId}`,
    );
  }
}

export async function criarEvento(
  professorId: string,
  turmaId: string,
  input: CriarEventoInput,
) {
  const turma = await assertTurmaDoProfessor(turmaId, professorId);

  const inicio = new Date(input.inicio);
  if (Number.isNaN(inicio.getTime())) {
    throw new AppError(400, "DATA_INVALIDA", "Data/hora inválida");
  }

  const id = generateId();
  const ts = now();
  const titulo = gerarTituloEvento(input.tipo, input.adversario, input.titulo);

  await execute(
    `INSERT INTO "Evento" (
       id, turma_id, tipo, titulo, descricao, adversario, local,
       inicio, fim, permite_confirmacao_aluno, ativo, criado_em, atualizado_em
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      id,
      turmaId,
      input.tipo,
      titulo,
      input.descricao?.trim() || null,
      input.adversario?.trim() || null,
      input.local?.trim() || null,
      inicio.toISOString(),
      null,
      false,
      true,
      ts,
      ts,
    ],
  );

  await notificarEventoParaTurma(turmaId, turma.nome, {
    tipo: input.tipo,
    titulo,
    inicio: inicio.toISOString(),
    local: input.local?.trim() || null,
  });

  return {
    id,
    turmaId,
    turmaNome: turma.nome,
    tipo: input.tipo,
    titulo,
    adversario: input.adversario?.trim() || null,
    descricao: input.descricao?.trim() || null,
    local: input.local?.trim() || null,
    inicio: inicio.toISOString(),
    fim: null,
    passado: false,
  };
}

export async function listarEventosDaTurma(turmaId: string, professorId: string) {
  await assertTurmaDoProfessor(turmaId, professorId);

  const eventos = await query<EventoRow>(
    `SELECT e.*, t.nome AS turma_nome
     FROM "Evento" e
     JOIN "Turma" t ON t.id = e.turma_id
     WHERE e.turma_id = $1 AND e.ativo = true
     ORDER BY e.inicio ASC`,
    [turmaId],
  );

  return eventos.map((e) => mapEvento(e));
}

export async function listarEventosDoProfessor(professorId: string) {
  const turmaIds = await turmaIdsDoProfessor(professorId);
  if (turmaIds.length === 0) return [];

  const eventos = await query<EventoRow>(
    `SELECT e.*, t.nome AS turma_nome
     FROM "Evento" e
     JOIN "Turma" t ON t.id = e.turma_id
     WHERE e.turma_id = ANY($1::text[]) AND e.ativo = true
     ORDER BY e.inicio ASC`,
    [turmaIds],
  );

  return eventos.map((e) => mapEvento(e));
}

export async function listarEventosDoAluno(alunoId: string) {
  const turmaIds = await turmaIdsDoAluno(alunoId);
  if (turmaIds.length === 0) return [];

  const eventos = await query<EventoRow>(
    `SELECT e.*, t.nome AS turma_nome
     FROM "Evento" e
     JOIN "Turma" t ON t.id = e.turma_id
     WHERE e.turma_id = ANY($1::text[])
       AND e.ativo = true
       AND e.tipo = ANY($2::"TipoEvento"[])
     ORDER BY e.inicio ASC`,
    [turmaIds, [TipoEvento.AMISTOSO, TipoEvento.CAMPEONATO]],
  );

  return eventos.map((e) => mapEvento(e));
}

export async function atualizarEvento(
  professorId: string,
  turmaId: string,
  eventoId: string,
  input: AtualizarEventoInput,
) {
  await assertTurmaDoProfessor(turmaId, professorId);
  await assertEventoDoProfessor(eventoId, turmaId, professorId);

  const atual = await queryOne<{
    tipo: string;
    titulo: string;
    adversario: string | null;
    descricao: string | null;
    local: string | null;
    inicio: string;
  }>(
    `SELECT tipo, titulo, adversario, descricao, local, inicio
     FROM "Evento" WHERE id = $1`,
    [eventoId],
    { message: "Evento não encontrado" },
  );

  const tipo = input.tipo ?? atual.tipo;
  const adversario = input.adversario !== undefined ? input.adversario : atual.adversario;
  const titulo =
    input.titulo !== undefined
      ? input.titulo.trim()
      : gerarTituloEvento(tipo, adversario, atual.titulo);

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const addField = (column: string, value: unknown) => {
    fields.push(`"${column}" = $${idx++}`);
    values.push(value);
  };

  addField("atualizado_em", now());
  addField("tipo", tipo);
  addField("titulo", titulo);
  addField("adversario", adversario?.trim() || null);

  if (input.descricao !== undefined) addField("descricao", input.descricao?.trim() || null);
  if (input.local !== undefined) addField("local", input.local?.trim() || null);
  if (input.inicio !== undefined) {
    const inicio = new Date(input.inicio);
    if (Number.isNaN(inicio.getTime())) {
      throw new AppError(400, "DATA_INVALIDA", "Data/hora inválida");
    }
    addField("inicio", inicio.toISOString());
  }

  values.push(eventoId);

  await execute(
    `UPDATE "Evento" SET ${fields.join(", ")} WHERE id = $${idx}`,
    values,
  );

  const atualizado = await queryOne<EventoRow>(
    `SELECT e.*, t.nome AS turma_nome
     FROM "Evento" e
     JOIN "Turma" t ON t.id = e.turma_id
     WHERE e.id = $1`,
    [eventoId],
    { message: "Evento não encontrado" },
  );

  return mapEvento(atualizado);
}

export async function excluirEvento(
  professorId: string,
  turmaId: string,
  eventoId: string,
) {
  await assertTurmaDoProfessor(turmaId, professorId);
  await assertEventoDoProfessor(eventoId, turmaId, professorId);

  await execute(
    `UPDATE "Evento" SET ativo = false, atualizado_em = $1 WHERE id = $2`,
    [now(), eventoId],
  );

  return { ok: true };
}

async function turmaIdsDoAluno(alunoId: string): Promise<string[]> {
  const rows = await query<{ turma_id: string }>(
    `SELECT turma_id FROM "MatriculaTurma" WHERE aluno_id = $1 AND afastado = false`,
    [alunoId],
  );
  return rows.map((m) => m.turma_id);
}

async function assertAlunoNaTurma(alunoId: string, turmaId: string) {
  const matricula = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "MatriculaTurma"
     WHERE aluno_id = $1 AND turma_id = $2 AND afastado = false`,
    [alunoId, turmaId],
  );

  if (!matricula) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }
}

export async function proximosEventosDoAluno(alunoId: string) {
  const turmaIds = await turmaIdsDoAluno(alunoId);
  if (turmaIds.length === 0) return [];

  const eventos = await query<EventoRow>(
    `SELECT e.*, t.nome AS turma_nome
     FROM "Evento" e
     JOIN "Turma" t ON t.id = e.turma_id
     WHERE e.turma_id = ANY($1::text[])
       AND e.ativo = true
       AND e.tipo = ANY($2::"TipoEvento"[])`,
    [turmaIds, [TipoEvento.AMISTOSO, TipoEvento.CAMPEONATO]],
  );

  const mapeados = eventos.map((e) => mapEvento(e));
  return ordenarEventosPorInicioAsc(filtrarEventosFuturos(mapeados));
}

export async function proximoEventoDoAluno(alunoId: string) {
  const eventos = await proximosEventosDoAluno(alunoId);
  return eventos[0] ?? null;
}

export async function proximosEventosDaTurmaAluno(alunoId: string, turmaId: string) {
  await assertAlunoNaTurma(alunoId, turmaId);

  const eventos = await query<EventoRow>(
    `SELECT e.*, t.nome AS turma_nome
     FROM "Evento" e
     JOIN "Turma" t ON t.id = e.turma_id
     WHERE e.turma_id = $1
       AND e.ativo = true
       AND e.tipo = ANY($2::"TipoEvento"[])`,
    [turmaId, [TipoEvento.AMISTOSO, TipoEvento.CAMPEONATO]],
  );

  const mapeados = eventos.map((e) => mapEvento(e));
  return ordenarEventosPorInicioAsc(filtrarEventosFuturos(mapeados));
}

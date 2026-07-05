import { supabase } from "../../config/supabase.js";
import { generateId, now, relOne, throwOnError } from "../../lib/db.js";
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
  Turma?: { nome: string } | { nome: string }[] | null;
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
  const turma = turmaNome ?? relOne(e.Turma as { nome: string } | { nome: string }[] | null)?.nome ?? "";
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
  const turmaCheck = await supabase
    .from("Turma")
    .select("id, nome")
    .eq("id", turmaId)
    .eq("professor_id", professorId)
    .maybeSingle();

  if (!turmaCheck.data) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  return turmaCheck.data as { id: string; nome: string };
}

async function assertEventoDoProfessor(eventoId: string, turmaId: string, professorId: string) {
  const eventoCheck = await supabase
    .from("Evento")
    .select("id")
    .eq("id", eventoId)
    .eq("turma_id", turmaId)
    .eq("ativo", true)
    .maybeSingle();

  if (!eventoCheck.data) {
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

  const { data: matriculas } = await supabase
    .from("MatriculaTurma")
    .select("aluno_id")
    .eq("turma_id", turmaId)
    .eq("afastado", false);

  for (const m of matriculas ?? []) {
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

  throwOnError(
    await supabase.from("Evento").insert({
      id,
      turma_id: turmaId,
      tipo: input.tipo,
      titulo,
      descricao: input.descricao?.trim() || null,
      adversario: input.adversario?.trim() || null,
      local: input.local?.trim() || null,
      inicio: inicio.toISOString(),
      fim: null,
      permite_confirmacao_aluno: false,
      ativo: true,
      criado_em: ts,
      atualizado_em: ts,
    }),
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

  const result = await supabase
    .from("Evento")
    .select("*, Turma(nome)")
    .eq("turma_id", turmaId)
    .eq("ativo", true)
    .order("inicio", { ascending: true });

  const eventos = throwOnError(result) as EventoRow[];
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

  const atualResult = await supabase
    .from("Evento")
    .select("tipo, titulo, adversario, descricao, local, inicio")
    .eq("id", eventoId)
    .maybeSingle();

  const atual = throwOnError(atualResult, { message: "Evento não encontrado" }) as {
    tipo: string;
    titulo: string;
    adversario: string | null;
    descricao: string | null;
    local: string | null;
    inicio: string;
  };

  const tipo = input.tipo ?? atual.tipo;
  const adversario = input.adversario !== undefined ? input.adversario : atual.adversario;
  const titulo =
    input.titulo !== undefined
      ? input.titulo.trim()
      : gerarTituloEvento(tipo, adversario, atual.titulo);

  const patch: Record<string, unknown> = {
    atualizado_em: now(),
    tipo,
    titulo,
    adversario: adversario?.trim() || null,
  };

  if (input.descricao !== undefined) patch.descricao = input.descricao?.trim() || null;
  if (input.local !== undefined) patch.local = input.local?.trim() || null;
  if (input.inicio !== undefined) {
    const inicio = new Date(input.inicio);
    if (Number.isNaN(inicio.getTime())) {
      throw new AppError(400, "DATA_INVALIDA", "Data/hora inválida");
    }
    patch.inicio = inicio.toISOString();
  }

  throwOnError(
    await supabase.from("Evento").update(patch).eq("id", eventoId),
  );

  const atualizado = throwOnError(
    await supabase
      .from("Evento")
      .select("*, Turma(nome)")
      .eq("id", eventoId)
      .maybeSingle(),
    { message: "Evento não encontrado" },
  ) as EventoRow;

  return mapEvento(atualizado);
}

export async function excluirEvento(
  professorId: string,
  turmaId: string,
  eventoId: string,
) {
  await assertTurmaDoProfessor(turmaId, professorId);
  await assertEventoDoProfessor(eventoId, turmaId, professorId);

  throwOnError(
    await supabase
      .from("Evento")
      .update({ ativo: false, atualizado_em: now() })
      .eq("id", eventoId),
  );

  return { ok: true };
}

async function turmaIdsDoAluno(alunoId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("MatriculaTurma")
    .select("turma_id")
    .eq("aluno_id", alunoId)
    .eq("afastado", false);

  if (error) throw new AppError(500, "DB_ERROR", error.message);
  return (data ?? []).map((m) => m.turma_id);
}

async function assertAlunoNaTurma(alunoId: string, turmaId: string) {
  const matricula = await supabase
    .from("MatriculaTurma")
    .select("id")
    .eq("aluno_id", alunoId)
    .eq("turma_id", turmaId)
    .eq("afastado", false)
    .maybeSingle();

  if (!matricula.data) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }
}

export async function proximosEventosDoAluno(alunoId: string) {
  const turmaIds = await turmaIdsDoAluno(alunoId);
  if (turmaIds.length === 0) return [];

  const result = await supabase
    .from("Evento")
    .select("*, Turma(nome)")
    .in("turma_id", turmaIds)
    .eq("ativo", true)
    .in("tipo", [TipoEvento.AMISTOSO, TipoEvento.CAMPEONATO]);

  const eventos = throwOnError(result) as EventoRow[];
  const mapeados = eventos.map((e) => mapEvento(e));
  return ordenarEventosPorInicioAsc(filtrarEventosFuturos(mapeados));
}

export async function proximoEventoDoAluno(alunoId: string) {
  const eventos = await proximosEventosDoAluno(alunoId);
  return eventos[0] ?? null;
}

export async function proximosEventosDaTurmaAluno(alunoId: string, turmaId: string) {
  await assertAlunoNaTurma(alunoId, turmaId);

  const result = await supabase
    .from("Evento")
    .select("*, Turma(nome)")
    .eq("turma_id", turmaId)
    .eq("ativo", true)
    .in("tipo", [TipoEvento.AMISTOSO, TipoEvento.CAMPEONATO]);

  const eventos = throwOnError(result) as EventoRow[];
  const mapeados = eventos.map((e) => mapEvento(e));
  return ordenarEventosPorInicioAsc(filtrarEventosFuturos(mapeados));
}

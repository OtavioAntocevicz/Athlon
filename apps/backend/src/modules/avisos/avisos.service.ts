import { supabase } from "../../config/supabase.js";
import { generateId, now, relOne, throwOnError } from "../../lib/db.js";
import { AppError } from "../../middleware/error-handler.js";
import { criarNotificacao, usuarioIdDoAluno } from "../../lib/notificacoes.js";
import type { CriarAvisoInput } from "@athlon/shared-types";

async function enviarAvisoParaTurma(turmaId: string, titulo: string, descricao: string) {
  const { data: matriculas } = await supabase
    .from("MatriculaTurma")
    .select("aluno_id")
    .eq("turma_id", turmaId)
    .eq("afastado", false);

  for (const m of matriculas ?? []) {
    const usuarioId = await usuarioIdDoAluno(m.aluno_id);
    if (!usuarioId) continue;
    await criarNotificacao(usuarioId, titulo, descricao, "AVISO_PROFESSOR");
  }
}

export async function criarAviso(professorId: string, input: CriarAvisoInput) {
  const turmaCheck = await supabase
    .from("Turma")
    .select("id, nome")
    .eq("id", input.turmaId)
    .eq("professor_id", professorId)
    .maybeSingle();

  if (!turmaCheck.data) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  const id = generateId();
  const ts = now();
  const agendadoPara = input.agendadoPara ? new Date(input.agendadoPara) : null;

  if (agendadoPara && agendadoPara.getTime() <= Date.now()) {
    throw new AppError(400, "DATA_INVALIDA", "Data de agendamento deve ser no futuro");
  }

  const enviarAgora = !agendadoPara;

  throwOnError(
    await supabase.from("AvisoProfessor").insert({
      id,
      professor_id: professorId,
      turma_id: input.turmaId,
      titulo: input.titulo,
      descricao: input.descricao,
      agendado_para: agendadoPara?.toISOString() ?? null,
      enviado_em: enviarAgora ? ts : null,
      criado_em: ts,
    }),
  );

  if (enviarAgora) {
    await enviarAvisoParaTurma(input.turmaId, input.titulo, input.descricao);
  }

  return {
    id,
    titulo: input.titulo,
    turmaNome: turmaCheck.data.nome,
    agendadoPara: agendadoPara?.toISOString() ?? null,
    enviadoEm: enviarAgora ? new Date(ts).toISOString() : null,
  };
}

export async function listarAvisos(professorId: string) {
  const result = await supabase
    .from("AvisoProfessor")
    .select("*, Turma(nome)")
    .eq("professor_id", professorId)
    .order("criado_em", { ascending: false })
    .limit(50);

  const avisos = throwOnError(result);

  return avisos.map((a) => {
    const turma = relOne(a.Turma as { nome: string } | { nome: string }[] | null);
    return {
      id: a.id,
      titulo: a.titulo,
      descricao: a.descricao,
      turmaId: a.turma_id,
      turmaNome: turma?.nome ?? "",
      agendadoPara: a.agendado_para ? new Date(a.agendado_para).toISOString() : null,
      enviadoEm: a.enviado_em ? new Date(a.enviado_em).toISOString() : null,
      criadoEm: new Date(a.criado_em).toISOString(),
      status: a.enviado_em ? "ENVIADO" : "AGENDADO",
    };
  });
}

export async function processarAvisosAgendados() {
  const agora = new Date().toISOString();
  const { data: pendentes } = await supabase
    .from("AvisoProfessor")
    .select("id, turma_id, titulo, descricao")
    .is("enviado_em", null)
    .not("agendado_para", "is", null)
    .lte("agendado_para", agora);

  for (const aviso of pendentes ?? []) {
    await enviarAvisoParaTurma(aviso.turma_id, aviso.titulo, aviso.descricao);
    await supabase
      .from("AvisoProfessor")
      .update({ enviado_em: now() })
      .eq("id", aviso.id);
  }
}

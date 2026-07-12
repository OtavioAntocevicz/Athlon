import { supabase } from "../../config/supabase.js";
import { generateId, now, relOne, throwOnError } from "../../lib/db.js";
import { AppError } from "../../middleware/error-handler.js";
import type {
  AutorChamado,
  ChamadoDetalhe,
  CriarChamadoInput,
  ResponderChamadoInput,
} from "@athlon/shared-types";

type AutorIds = { alunoId?: string | null; professorId?: string | null };

function mapDetalhe(
  c: Record<string, unknown>,
  autorNome: string,
  autorTipo: AutorChamado,
): ChamadoDetalhe {
  return {
    id: c.id as string,
    alunoId: (c.aluno_id as string | null) ?? null,
    professorId: (c.professor_id as string | null) ?? null,
    autorTipo,
    autorNome,
    alunoNome: autorNome,
    assunto: c.assunto as string,
    mensagem: c.mensagem as string,
    status: c.status as string,
    respostaAdmin: (c.resposta_admin as string | null) ?? null,
    respondidoEm: c.respondido_em
      ? new Date(c.respondido_em as string).toISOString()
      : null,
    criadoEm: new Date(c.criado_em as string).toISOString(),
    atualizadoEm: new Date(c.atualizado_em as string).toISOString(),
  };
}

export async function listarMeusChamados(autor: AutorIds) {
  let query = supabase
    .from("Chamado")
    .select("id, assunto, status, criado_em, atualizado_em")
    .order("criado_em", { ascending: false });

  if (autor.alunoId) query = query.eq("aluno_id", autor.alunoId);
  else if (autor.professorId) query = query.eq("professor_id", autor.professorId);
  else return [];

  return throwOnError(await query).map((c) => ({
    id: c.id as string,
    assunto: c.assunto as string,
    status: c.status as string,
    criadoEm: new Date(c.criado_em as string).toISOString(),
    atualizadoEm: new Date(c.atualizado_em as string).toISOString(),
  }));
}

export async function obterMeuChamado(chamadoId: string, autor: AutorIds) {
  let query = supabase.from("Chamado").select("*").eq("id", chamadoId);

  if (autor.alunoId) query = query.eq("aluno_id", autor.alunoId);
  else if (autor.professorId) query = query.eq("professor_id", autor.professorId);
  else throw new AppError(403, "FORBIDDEN", "Acesso negado");

  const result = await query.maybeSingle();
  const c = result.data;
  if (!c) throw new AppError(404, "NOT_FOUND", "Chamado não encontrado");

  const autorTipo: AutorChamado = c.professor_id ? "PROFESSOR" : "ALUNO";
  return mapDetalhe(c as Record<string, unknown>, "", autorTipo);
}

export async function criarChamado(autor: AutorIds, input: CriarChamadoInput) {
  if (!autor.alunoId && !autor.professorId) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }

  const id = generateId();
  const ts = now();

  throwOnError(
    await supabase.from("Chamado").insert({
      id,
      aluno_id: autor.alunoId ?? null,
      professor_id: autor.professorId ?? null,
      assunto: input.assunto.trim(),
      mensagem: input.mensagem.trim(),
      status: "ABERTO",
      criado_em: ts,
      atualizado_em: ts,
    }),
  );

  return obterMeuChamado(id, autor);
}

export async function listarChamadosAdmin(status?: string) {
  let query = supabase
    .from("Chamado")
    .select(
      "id, assunto, status, criado_em, atualizado_em, aluno_id, professor_id, Aluno(nome, sobrenome), Professor(Usuario(nome))",
    )
    .order("criado_em", { ascending: false });

  if (status) query = query.eq("status", status);

  const rows = throwOnError(await query);

  return rows.map((c) => {
    const aluno = relOne(c.Aluno) as { nome: string; sobrenome: string | null } | null;
    const professor = relOne(c.Professor) as {
      Usuario: { nome: string } | { nome: string }[] | null;
    } | null;
    const profUsuario = professor ? relOne(professor.Usuario) : null;

    const autorTipo: AutorChamado = c.professor_id ? "PROFESSOR" : "ALUNO";
    const autorNome = c.professor_id
      ? (profUsuario?.nome ?? "Treinador")
      : aluno
        ? [aluno.nome, aluno.sobrenome].filter(Boolean).join(" ")
        : "Aluno";

    return {
      id: c.id as string,
      assunto: c.assunto as string,
      status: c.status as string,
      criadoEm: new Date(c.criado_em as string).toISOString(),
      atualizadoEm: new Date(c.atualizado_em as string).toISOString(),
      autorTipo,
      autorNome,
      alunoNome: autorNome,
    };
  });
}

export async function obterChamadoAdmin(chamadoId: string) {
  const result = await supabase
    .from("Chamado")
    .select("*, Aluno(id, nome, sobrenome), Professor(id, Usuario(nome))")
    .eq("id", chamadoId)
    .maybeSingle();

  const c = result.data;
  if (!c) throw new AppError(404, "NOT_FOUND", "Chamado não encontrado");

  const aluno = relOne(c.Aluno) as {
    id: string;
    nome: string;
    sobrenome: string | null;
  } | null;
  const professor = relOne(c.Professor) as {
    id: string;
    Usuario: { nome: string } | { nome: string }[] | null;
  } | null;
  const profUsuario = professor ? relOne(professor.Usuario) : null;

  const autorTipo: AutorChamado = c.professor_id ? "PROFESSOR" : "ALUNO";
  const autorNome = c.professor_id
    ? (profUsuario?.nome ?? "Treinador")
    : aluno
      ? [aluno.nome, aluno.sobrenome].filter(Boolean).join(" ")
      : "Aluno";

  return mapDetalhe(c as Record<string, unknown>, autorNome, autorTipo);
}

export async function responderChamadoAdmin(
  chamadoId: string,
  input: ResponderChamadoInput,
) {
  const existing = await supabase
    .from("Chamado")
    .select("id")
    .eq("id", chamadoId)
    .maybeSingle();

  if (!existing.data) throw new AppError(404, "NOT_FOUND", "Chamado não encontrado");

  const ts = now();
  const status = input.status ?? "RESPONDIDO";

  throwOnError(
    await supabase
      .from("Chamado")
      .update({
        resposta_admin: input.respostaAdmin.trim(),
        status,
        respondido_em: ts,
        atualizado_em: ts,
      })
      .eq("id", chamadoId),
  );

  return obterChamadoAdmin(chamadoId);
}

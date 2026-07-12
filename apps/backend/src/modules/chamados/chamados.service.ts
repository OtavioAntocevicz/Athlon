import { supabase } from "../../config/supabase.js";
import { generateId, now, relOne, throwOnError } from "../../lib/db.js";
import { AppError } from "../../middleware/error-handler.js";
import type { CriarChamadoInput, ResponderChamadoInput } from "@athlon/shared-types";

export async function listarMeusChamados(alunoId: string) {
  const result = await supabase
    .from("Chamado")
    .select("id, assunto, status, criado_em, atualizado_em")
    .eq("aluno_id", alunoId)
    .order("criado_em", { ascending: false });

  return throwOnError(result).map((c) => ({
    id: c.id as string,
    assunto: c.assunto as string,
    status: c.status as string,
    criadoEm: new Date(c.criado_em as string).toISOString(),
    atualizadoEm: new Date(c.atualizado_em as string).toISOString(),
  }));
}

export async function obterChamadoAluno(chamadoId: string, alunoId: string) {
  const result = await supabase
    .from("Chamado")
    .select("*")
    .eq("id", chamadoId)
    .eq("aluno_id", alunoId)
    .maybeSingle();

  const c = result.data;
  if (!c) throw new AppError(404, "NOT_FOUND", "Chamado não encontrado");

  return {
    id: c.id as string,
    alunoId: c.aluno_id as string,
    alunoNome: "",
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

export async function criarChamado(alunoId: string, input: CriarChamadoInput) {
  const id = generateId();
  const ts = now();

  throwOnError(
    await supabase.from("Chamado").insert({
      id,
      aluno_id: alunoId,
      assunto: input.assunto.trim(),
      mensagem: input.mensagem.trim(),
      status: "ABERTO",
      criado_em: ts,
      atualizado_em: ts,
    }),
  );

  return obterChamadoAluno(id, alunoId);
}

export async function listarChamadosAdmin(status?: string) {
  let query = supabase
    .from("Chamado")
    .select("id, assunto, status, criado_em, atualizado_em, Aluno(nome, sobrenome)")
    .order("criado_em", { ascending: false });

  if (status) query = query.eq("status", status);

  const rows = throwOnError(await query);

  return rows.map((c) => {
    const aluno = relOne(c.Aluno) as { nome: string; sobrenome: string | null } | null;
    return {
      id: c.id as string,
      assunto: c.assunto as string,
      status: c.status as string,
      criadoEm: new Date(c.criado_em as string).toISOString(),
      atualizadoEm: new Date(c.atualizado_em as string).toISOString(),
      alunoNome: aluno
        ? [aluno.nome, aluno.sobrenome].filter(Boolean).join(" ")
        : "Aluno",
    };
  });
}

export async function obterChamadoAdmin(chamadoId: string) {
  const result = await supabase
    .from("Chamado")
    .select("*, Aluno(id, nome, sobrenome)")
    .eq("id", chamadoId)
    .maybeSingle();

  const c = result.data;
  if (!c) throw new AppError(404, "NOT_FOUND", "Chamado não encontrado");

  const aluno = relOne(c.Aluno) as {
    id: string;
    nome: string;
    sobrenome: string | null;
  } | null;

  return {
    id: c.id as string,
    alunoId: (aluno?.id ?? c.aluno_id) as string,
    alunoNome: aluno
      ? [aluno.nome, aluno.sobrenome].filter(Boolean).join(" ")
      : "Aluno",
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

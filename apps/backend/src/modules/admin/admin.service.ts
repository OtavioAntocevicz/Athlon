import bcrypt from "bcryptjs";
import { supabase } from "../../config/supabase.js";
import { generateId, now, relOne, throwOnError } from "../../lib/db.js";
import { AppError } from "../../middleware/error-handler.js";
import type {
  CreateProfessorAdminInput,
  UpdateProfessorStatusInput,
} from "@athlon/shared-types";
import { listarAlunos } from "../alunos/alunos.service.js";

const BCRYPT_ROUNDS = 12;

type ProfessorRow = {
  id: string;
  usuario_id: string;
  chave_pix: string | null;
  criado_em: string;
  Usuario: {
    id: string;
    nome: string;
    email: string;
    ativo: boolean;
    criado_em: string;
  } | {
    id: string;
    nome: string;
    email: string;
    ativo: boolean;
    criado_em: string;
  }[] | null;
};

async function countAlunosAtivosPorProfessor(professorId: string): Promise<number> {
  const { data: turmas } = await supabase
    .from("Turma")
    .select("id")
    .eq("professor_id", professorId);

  const turmaIds = (turmas ?? []).map((t) => t.id);
  if (turmaIds.length === 0) return 0;

  const { data: matriculas } = await supabase
    .from("MatriculaTurma")
    .select("aluno_id")
    .in("turma_id", turmaIds)
    .eq("afastado", false);

  const unique = new Set((matriculas ?? []).map((m) => m.aluno_id));
  return unique.size;
}

async function buildProfessorResumo(prof: ProfessorRow) {
  const usuario = relOne(prof.Usuario);
  if (!usuario) return null;

  const { count: turmasCount } = await supabase
    .from("Turma")
    .select("*", { count: "exact", head: true })
    .eq("professor_id", prof.id);

  const totalAlunos = await countAlunosAtivosPorProfessor(prof.id);

  return {
    id: prof.id,
    usuarioId: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    ativo: usuario.ativo,
    totalTurmas: turmasCount ?? 0,
    totalAlunos,
    criadoEm: new Date(usuario.criado_em).toISOString(),
  };
}

export async function getDashboard() {
  const { count: professoresAtivos } = await supabase
    .from("Usuario")
    .select("*", { count: "exact", head: true })
    .eq("perfil", "PROFESSOR")
    .eq("ativo", true);

  const { data: professoresAtivosRows } = await supabase
    .from("Professor")
    .select("id, Usuario!inner(ativo)")
    .eq("Usuario.ativo", true);

  const professorIds = (professoresAtivosRows ?? []).map((p) => p.id);

  let totalTurmas = 0;
  if (professorIds.length > 0) {
    const { count } = await supabase
      .from("Turma")
      .select("*", { count: "exact", head: true })
      .in("professor_id", professorIds);
    totalTurmas = count ?? 0;
  }

  let totalAlunos = 0;
  if (professorIds.length > 0) {
    const { data: turmas } = await supabase
      .from("Turma")
      .select("id")
      .in("professor_id", professorIds);
    const turmaIds = (turmas ?? []).map((t) => t.id);
    if (turmaIds.length > 0) {
      const { data: matriculas } = await supabase
        .from("MatriculaTurma")
        .select("aluno_id")
        .in("turma_id", turmaIds)
        .eq("afastado", false);
      totalAlunos = new Set((matriculas ?? []).map((m) => m.aluno_id)).size;
    }
  }

  const { data: alunosComConta } = await supabase
    .from("Aluno")
    .select("id")
    .not("usuario_id", "is", null);

  const alunoIdsComConta = (alunosComConta ?? []).map((a) => a.id);
  let alunosSemTurma = 0;
  if (alunoIdsComConta.length > 0) {
    const { data: matriculasAtivas } = await supabase
      .from("MatriculaTurma")
      .select("aluno_id")
      .in("aluno_id", alunoIdsComConta)
      .eq("afastado", false);
    const comTurma = new Set((matriculasAtivas ?? []).map((m) => m.aluno_id));
    alunosSemTurma = alunoIdsComConta.filter((id) => !comTurma.has(id)).length;
  }

  const professores = await listarProfessores();

  return {
    professoresAtivos: professoresAtivos ?? 0,
    totalTurmas,
    totalAlunos,
    alunosSemTurma,
    professores,
  };
}

export async function listarProfessores(filtros?: { busca?: string; ativo?: boolean }) {
  let query = supabase
    .from("Professor")
    .select("id, usuario_id, chave_pix, criado_em, Usuario(id, nome, email, ativo, criado_em)")
    .order("criado_em", { ascending: false });

  if (filtros?.ativo !== undefined) {
    query = query.eq("Usuario.ativo", filtros.ativo);
  }

  const result = await query;
  if (result.error) throw new AppError(500, "DB_ERROR", result.error.message);

  const items = [];
  for (const row of (result.data ?? []) as ProfessorRow[]) {
    const resumo = await buildProfessorResumo(row);
    if (!resumo) continue;

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

export async function criarProfessor(input: CreateProfessorAdminInput) {
  const exists = await supabase
    .from("Usuario")
    .select("id")
    .eq("email", input.email)
    .maybeSingle();

  if (exists.data) {
    throw new AppError(409, "EMAIL_EXISTS", "E-mail já cadastrado");
  }

  const senha_hash = await bcrypt.hash(input.senha, BCRYPT_ROUNDS);
  const usuarioId = generateId();
  const professorId = generateId();
  const ts = now();

  const usuarioResult = await supabase.from("Usuario").insert({
    id: usuarioId,
    email: input.email,
    nome: input.nome,
    senha_hash,
    perfil: "PROFESSOR",
    ativo: true,
    criado_em: ts,
    atualizado_em: ts,
  });

  if (usuarioResult.error?.code === "23505") {
    throw new AppError(409, "EMAIL_EXISTS", "E-mail já cadastrado");
  }
  throwOnError(usuarioResult);

  const professorResult = await supabase.from("Professor").insert({
    id: professorId,
    usuario_id: usuarioId,
    chave_pix: input.chavePix,
    criado_em: ts,
    atualizado_em: ts,
  });
  throwOnError(professorResult);

  return {
    id: professorId,
    usuarioId,
    nome: input.nome,
    email: input.email,
  };
}

export async function obterProfessor(professorId: string) {
  const result = await supabase
    .from("Professor")
    .select("id, usuario_id, chave_pix, criado_em, Usuario(id, nome, email, ativo, criado_em)")
    .eq("id", professorId)
    .maybeSingle();

  const prof = result.data as ProfessorRow | null;
  if (!prof) {
    throw new AppError(404, "NOT_FOUND", "Professor não encontrado");
  }

  const usuario = relOne(prof.Usuario);
  if (!usuario) {
    throw new AppError(404, "NOT_FOUND", "Professor não encontrado");
  }

  const { data: turmas } = await supabase
    .from("Turma")
    .select("id, nome, modalidade, codigo_convite, criado_em")
    .eq("professor_id", professorId)
    .order("criado_em", { ascending: false });

  const turmasResumo = [];
  for (const t of turmas ?? []) {
    const { count } = await supabase
      .from("MatriculaTurma")
      .select("*", { count: "exact", head: true })
      .eq("turma_id", t.id)
      .eq("afastado", false);

    turmasResumo.push({
      id: t.id,
      nome: t.nome,
      modalidade: t.modalidade,
      totalAlunos: count ?? 0,
      codigoConvite: t.codigo_convite,
      criadoEm: new Date(t.criado_em).toISOString(),
    });
  }

  const alunos = await listarAlunos(professorId);

  return {
    id: prof.id,
    usuarioId: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    chavePix: prof.chave_pix,
    ativo: usuario.ativo,
    criadoEm: new Date(usuario.criado_em).toISOString(),
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
  const result = await supabase
    .from("Professor")
    .select("usuario_id")
    .eq("id", professorId)
    .maybeSingle();

  if (!result.data) {
    throw new AppError(404, "NOT_FOUND", "Professor não encontrado");
  }

  throwOnError(
    await supabase
      .from("Usuario")
      .update({ ativo: input.ativo, atualizado_em: now() })
      .eq("id", result.data.usuario_id),
  );

  return { ok: true, ativo: input.ativo };
}

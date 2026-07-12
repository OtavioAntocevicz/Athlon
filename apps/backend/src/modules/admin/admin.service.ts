import bcrypt from "bcryptjs";
import { supabase } from "../../config/supabase.js";
import { generateId, matricularAlunoTurma, now, relOne, throwOnError } from "../../lib/db.js";
import { AppError } from "../../middleware/error-handler.js";
import type {
  CreateProfessorAdminInput,
  UpdateProfessorStatusInput,
} from "@athlon/shared-types";
import { listarAlunos } from "../alunos/alunos.service.js";
import { statusEfetivo } from "../../lib/mensalidade-focus.js";
import { isMesFuturo } from "../../lib/utils.js";
import { gerarMensalidadesParaAluno } from "../mensalidades/mensalidades.service.js";

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

async function statusFinanceiroAluno(alunoId: string): Promise<string> {
  const hoje = new Date();
  const pagResult = await supabase
    .from("Pagamento")
    .select("status, mes_referencia, vencimento")
    .eq("aluno_id", alunoId)
    .order("mes_referencia", { ascending: false });

  const pagamentos = (pagResult.data ?? []).filter(
    (p) => !isMesFuturo(p.mes_referencia, hoje),
  );
  const ultimo = pagamentos[0];
  return ultimo ? statusEfetivo(ultimo, hoje) : "PENDENTE";
}

export async function listarAlunosAdmin(filtros?: {
  busca?: string;
  semTurma?: boolean;
}) {
  const alunosResult = await supabase
    .from("Aluno")
    .select("id, nome, sobrenome, email, telefone, cpf, rg")
    .order("nome", { ascending: true });

  const alunos = throwOnError(alunosResult);

  const matriculasResult = await supabase
    .from("MatriculaTurma")
    .select("aluno_id, Turma(id, nome)")
    .eq("afastado", false);

  const matriculas = throwOnError(matriculasResult);
  const turmasPorAluno = new Map<string, { id: string; nome: string }[]>();

  for (const m of matriculas) {
    const turma = relOne(m.Turma) as { id: string; nome: string } | null;
    if (!turma) continue;
    const list = turmasPorAluno.get(m.aluno_id) ?? [];
    if (!list.some((t) => t.id === turma.id)) {
      list.push({ id: turma.id, nome: turma.nome });
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
  const turmaResult = await supabase
    .from("Turma")
    .select(
      "id, nome, modalidade, nivel, codigo_convite, local, horario_inicio, horario_fim, mensalidade_centavos, dia_vencimento, foto_url, criado_em, professor_id, Professor(id, Usuario(nome))",
    )
    .eq("id", turmaId)
    .maybeSingle();

  const turma = turmaResult.data;
  if (!turma) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  const professorRow = relOne(turma.Professor) as {
    id: string;
    Usuario: { nome: string } | { nome: string }[] | null;
  } | null;
  const usuario = professorRow ? relOne(professorRow.Usuario) : null;

  const alunosDoProfessor = await listarAlunos(turma.professor_id as string);
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
    fotoUrl: (turma.foto_url as string | null) ?? null,
    criadoEm: new Date(turma.criado_em).toISOString(),
    professor: {
      id: (professorRow?.id ?? turma.professor_id) as string,
      nome: usuario?.nome ?? "Professor",
    },
    totalAlunos: alunos.length,
    alunos,
  };
}

export async function obterAlunoAdmin(alunoId: string) {
  const alunoResult = await supabase
    .from("Aluno")
    .select("*, Usuario(criado_em)")
    .eq("id", alunoId)
    .maybeSingle();

  const aluno = alunoResult.data as
    | (Record<string, unknown> & {
        id: string;
        nome: string;
        sobrenome: string | null;
        telefone: string | null;
        email: string | null;
        rg: string | null;
        cpf: string | null;
        criado_em: string;
        Usuario: { criado_em: string } | { criado_em: string }[] | null;
      })
    | null;

  if (!aluno) {
    throw new AppError(404, "NOT_FOUND", "Aluno não encontrado");
  }

  const usuario = relOne(aluno.Usuario);

  const matriculasResult = await supabase
    .from("MatriculaTurma")
    .select(
      "posicao, numero_camisa, bloqueado_inadimplencia, matriculado_em, Turma(id, nome, professor_id, Professor(id, Usuario(nome)))",
    )
    .eq("aluno_id", alunoId)
    .eq("afastado", false);

  const matriculas = throwOnError(matriculasResult);

  const turmas = matriculas.flatMap((m) => {
    const t = relOne(m.Turma) as {
      id: string;
      nome: string;
      professor_id: string;
      Professor:
        | { id: string; Usuario: { nome: string } | { nome: string }[] | null }
        | { id: string; Usuario: { nome: string } | { nome: string }[] | null }[]
        | null;
    } | null;
    if (!t) return [];
    const prof = relOne(t.Professor);
    const profUsuario = prof ? relOne(prof.Usuario) : null;
    return [
      {
        id: t.id,
        nome: t.nome,
        professorId: (prof?.id ?? t.professor_id) as string,
        professorNome: profUsuario?.nome ?? "Professor",
        numeroCamisa: m.numero_camisa as number | null,
        posicao: m.posicao as string | null,
        bloqueadoInadimplencia: (m.bloqueado_inadimplencia as boolean) ?? false,
        matriculadoEm: new Date(m.matriculado_em as string).toISOString(),
      },
    ];
  });

  const pagamentosResult = await supabase
    .from("Pagamento")
    .select("*")
    .eq("aluno_id", alunoId)
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
    criadoEm: new Date(aluno.criado_em).toISOString(),
    contaCriadaEm: usuario?.criado_em
      ? new Date(usuario.criado_em).toISOString()
      : null,
    turmas,
    mensalidades,
  };
}

export async function listarTurmasAdmin(busca?: string) {
  const result = await supabase
    .from("Turma")
    .select(
      "id, nome, modalidade, codigo_convite, professor_id, Professor(id, Usuario(nome))",
    )
    .order("nome", { ascending: true });

  const turmas = throwOnError(result);
  const termo = busca?.trim().toLowerCase() ?? "";
  const items = [];

  for (const t of turmas) {
    const prof = relOne(t.Professor) as {
      id: string;
      Usuario: { nome: string } | { nome: string }[] | null;
    } | null;
    const usuario = prof ? relOne(prof.Usuario) : null;
    const professorNome = usuario?.nome ?? "Professor";

    if (
      termo &&
      !t.nome.toLowerCase().includes(termo) &&
      !professorNome.toLowerCase().includes(termo) &&
      !(t.codigo_convite as string).toLowerCase().includes(termo)
    ) {
      continue;
    }

    const { count } = await supabase
      .from("MatriculaTurma")
      .select("*", { count: "exact", head: true })
      .eq("turma_id", t.id)
      .eq("afastado", false);

    items.push({
      id: t.id as string,
      nome: t.nome as string,
      modalidade: t.modalidade as string,
      professorId: (prof?.id ?? t.professor_id) as string,
      professorNome,
      totalAlunos: count ?? 0,
      codigoConvite: t.codigo_convite as string,
    });
  }

  return items;
}

export async function listarBloqueiosAdmin() {
  const result = await supabase
    .from("MatriculaTurma")
    .select(
      "aluno_id, turma_id, Aluno(id, nome, sobrenome), Turma(id, nome, Professor(Usuario(nome)))",
    )
    .eq("afastado", false)
    .eq("bloqueado_inadimplencia", true);

  const rows = throwOnError(result);

  return rows.flatMap((m) => {
    const aluno = relOne(m.Aluno) as {
      id: string;
      nome: string;
      sobrenome: string | null;
    } | null;
    const turma = relOne(m.Turma) as {
      id: string;
      nome: string;
      Professor:
        | { Usuario: { nome: string } | { nome: string }[] | null }
        | { Usuario: { nome: string } | { nome: string }[] | null }[]
        | null;
    } | null;
    if (!aluno || !turma) return [];
    const prof = relOne(turma.Professor);
    const usuario = prof ? relOne(prof.Usuario) : null;
    return [
      {
        alunoId: aluno.id,
        alunoNome: [aluno.nome, aluno.sobrenome].filter(Boolean).join(" "),
        turmaId: turma.id,
        turmaNome: turma.nome,
        professorNome: usuario?.nome ?? "Professor",
      },
    ];
  });
}

export async function matricularAlunoAdmin(alunoId: string, turmaId: string) {
  const aluno = await supabase.from("Aluno").select("id").eq("id", alunoId).maybeSingle();
  if (!aluno.data) throw new AppError(404, "NOT_FOUND", "Aluno não encontrado");

  const turma = await supabase.from("Turma").select("id").eq("id", turmaId).maybeSingle();
  if (!turma.data) throw new AppError(404, "NOT_FOUND", "Turma não encontrada");

  const ativa = await supabase
    .from("MatriculaTurma")
    .select("id")
    .eq("aluno_id", alunoId)
    .eq("turma_id", turmaId)
    .eq("afastado", false)
    .maybeSingle();

  if (ativa.data) {
    throw new AppError(409, "JA_MATRICULADO", "Aluno já está nesta turma");
  }

  await matricularAlunoTurma(alunoId, turmaId);
  await gerarMensalidadesParaAluno(alunoId, turmaId);
  return { ok: true };
}

export async function afastarAlunoAdmin(alunoId: string, turmaId: string) {
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
  const matriculaResult = await supabase
    .from("MatriculaTurma")
    .select("id, bloqueado_inadimplencia")
    .eq("aluno_id", alunoId)
    .eq("turma_id", turmaId)
    .eq("afastado", false)
    .maybeSingle();

  if (!matriculaResult.data) {
    throw new AppError(404, "NOT_FOUND", "Matrícula não encontrada");
  }

  if (!matriculaResult.data.bloqueado_inadimplencia) {
    throw new AppError(400, "NAO_BLOQUEADO", "Aluno não está bloqueado por inadimplência");
  }

  throwOnError(
    await supabase
      .from("MatriculaTurma")
      .update({ bloqueado_inadimplencia: false })
      .eq("id", matriculaResult.data.id),
  );

  return { ok: true };
}

import {
  execute,
  generateId,
  now,
  query,
  queryOne,
  turmaIdsDoProfessor,
} from "../../lib/db.js";
import { AppError } from "../../middleware/error-handler.js";
import {
  addMeses,
  calcularVencimento,
  inicioDoMes,
  isMesFuturo,
  toMesReferenciaDate,
} from "../../lib/utils.js";
import type { StatusMensalidade } from "@athlon/shared-types";

type TurmaRow = {
  id: string;
  mensalidade_centavos: number | null;
  dia_vencimento: number | null;
};

type MatriculaRow = { aluno_id: string };

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

async function upsertPagamento(
  alunoId: string,
  turmaId: string,
  mesRef: Date,
  vencimento: Date,
  valorCentavos: number,
) {
  const ts = now();
  await execute(
    `INSERT INTO "Pagamento" (id, aluno_id, turma_id, mes_referencia, vencimento, valor_centavos, status, criado_em, atualizado_em)
     VALUES ($1, $2, $3, $4, $5, $6, 'PENDENTE', $7, $7)
     ON CONFLICT (aluno_id, turma_id, mes_referencia) DO NOTHING`,
    [
      generateId(),
      alunoId,
      turmaId,
      toMesReferenciaDate(mesRef),
      toMesReferenciaDate(vencimento),
      valorCentavos,
      ts,
    ],
  );
}

export async function gerarMensalidadesParaTurma(turmaId: string, meses = 1) {
  const turma = await queryOne<TurmaRow>(
    `SELECT id, mensalidade_centavos, dia_vencimento FROM "Turma" WHERE id = $1`,
    [turmaId],
    { message: "Turma não encontrada" },
  );

  if (!turma.mensalidade_centavos || !turma.dia_vencimento) return;

  const matriculas = await query<MatriculaRow>(
    `SELECT aluno_id FROM "MatriculaTurma" WHERE turma_id = $1 AND afastado = false`,
    [turmaId],
  );

  const inicio = inicioDoMes();
  for (let i = 0; i < meses; i++) {
    const mesRef = addMeses(inicio, i);
    const vencimento = calcularVencimento(mesRef, turma.dia_vencimento);

    for (const matricula of matriculas) {
      await upsertPagamento(
        matricula.aluno_id,
        turmaId,
        mesRef,
        vencimento,
        turma.mensalidade_centavos,
      );
    }
  }
}

export async function gerarMensalidadesParaAluno(alunoId: string, turmaId: string) {
  const turma = await queryOne<TurmaRow>(
    `SELECT id, mensalidade_centavos, dia_vencimento FROM "Turma" WHERE id = $1`,
    [turmaId],
    { message: "Turma não encontrada" },
  );

  if (!turma.mensalidade_centavos || !turma.dia_vencimento) return;

  const mesRef = inicioDoMes();
  const vencimento = calcularVencimento(mesRef, turma.dia_vencimento);
  await upsertPagamento(
    alunoId,
    turmaId,
    mesRef,
    vencimento,
    turma.mensalidade_centavos,
  );
}

export async function marcarAtrasados() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  await execute(
    `UPDATE "Pagamento" SET status = 'ATRASADO'
     WHERE vencimento < $1 AND status IN ('PENDENTE', 'RECUSADO')`,
    [hoje.toISOString()],
  );
}

export async function listarMensalidades(filters: {
  professorId?: string;
  alunoId?: string;
  turmaId?: string;
  status?: StatusMensalidade;
}) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters.alunoId) {
    conditions.push(`p.aluno_id = $${paramIdx++}`);
    params.push(filters.alunoId);
  }
  if (filters.turmaId) {
    conditions.push(`p.turma_id = $${paramIdx++}`);
    params.push(filters.turmaId);
  }
  if (filters.status) {
    conditions.push(`p.status = $${paramIdx++}`);
    params.push(filters.status);
  }
  if (filters.professorId) {
    const ids = await turmaIdsDoProfessor(filters.professorId);
    if (ids.length === 0) return [];
    conditions.push(`p.turma_id = ANY($${paramIdx++})`);
    params.push(ids);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query<{
    id: string;
    aluno_id: string;
    turma_id: string;
    mes_referencia: string | Date;
    vencimento: string | Date | null;
    valor_centavos: number;
    status: string;
    aluno_nome: string;
    turma_nome: string;
    comprovante_arquivo_url: string | null;
  }>(
    `SELECT p.id, p.aluno_id, p.turma_id, p.mes_referencia, p.vencimento, p.valor_centavos, p.status,
            a.nome AS aluno_nome, t.nome AS turma_nome, c.arquivo_url AS comprovante_arquivo_url
     FROM "Pagamento" p
     JOIN "Aluno" a ON a.id = p.aluno_id
     JOIN "Turma" t ON t.id = p.turma_id
     LEFT JOIN "Comprovante" c ON c.pagamento_id = p.id AND c.ativo = true
     ${whereClause}
     ORDER BY p.mes_referencia DESC`,
    params,
  );

  const visiveis = rows.filter((p) => !isMesFuturo(toIso(p.mes_referencia)));

  return visiveis.map((p) => {
    const emAnalise = p.status === "EM_ANALISE";

    return {
      id: p.id,
      alunoId: p.aluno_id,
      alunoNome: p.aluno_nome ?? "",
      turmaId: p.turma_id,
      turmaNome: p.turma_nome ?? "",
      mesReferencia: new Date(toIso(p.mes_referencia)).toISOString(),
      vencimento: p.vencimento ? new Date(toIso(p.vencimento)).toISOString() : null,
      valorCentavos: p.valor_centavos,
      status: p.status,
      comprovanteUrl: p.comprovante_arquivo_url ?? null,
      comprovanteEmAnalise: emAnalise,
      // Preview só no detalhe (evita signed URL em massa na listagem)
      comprovantePreviewUrl: null,
    };
  });
}

export async function getMensalidade(
  id: string,
  user: { perfil: string; professorId?: string; alunoId?: string },
) {
  const p = await queryOne<{
    id: string;
    aluno_id: string;
    turma_id: string;
    mes_referencia: string | Date;
    vencimento: string | Date | null;
    valor_centavos: number;
    status: string;
    aluno_nome: string;
    turma_nome: string;
    professor_id: string;
    chave_pix: string | null;
    comprovante_id: string | null;
    comprovante_arquivo_url: string | null;
  }>(
    `SELECT p.id, p.aluno_id, p.turma_id, p.mes_referencia, p.vencimento, p.valor_centavos, p.status,
            a.nome AS aluno_nome, t.nome AS turma_nome, t.professor_id, t.chave_pix,
            c.id AS comprovante_id, c.arquivo_url AS comprovante_arquivo_url
     FROM "Pagamento" p
     JOIN "Aluno" a ON a.id = p.aluno_id
     JOIN "Turma" t ON t.id = p.turma_id
     LEFT JOIN "Comprovante" c ON c.pagamento_id = p.id AND c.ativo = true
     WHERE p.id = $1`,
    [id],
    { message: "Mensalidade não encontrada" },
  );

  if (user.perfil === "ALUNO" && p.aluno_id !== user.alunoId) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }
  if (user.perfil === "PROFESSOR" && p.professor_id !== user.professorId) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }

  let inadimplencia: { bloqueado: boolean; desbloquearaAoPagar: boolean } | null = null;
  if (user.perfil === "PROFESSOR" && p.status !== "PAGO") {
    const { preverDesbloqueioInadimplencia } = await import("../../lib/inadimplencia.js");
    inadimplencia = await preverDesbloqueioInadimplencia(p.aluno_id, p.turma_id, p.id);
  }

  return {
    id: p.id,
    alunoId: p.aluno_id,
    alunoNome: p.aluno_nome ?? "",
    turmaId: p.turma_id,
    turmaNome: p.turma_nome,
    chavePix: p.chave_pix,
    mesReferencia: new Date(toIso(p.mes_referencia)).toISOString(),
    vencimento: p.vencimento ? new Date(toIso(p.vencimento)).toISOString() : null,
    valorCentavos: p.valor_centavos,
    status: p.status,
    comprovanteUrl: p.comprovante_arquivo_url ?? null,
    comprovanteId: p.comprovante_id ?? null,
    inadimplencia,
  };
}

export async function marcarPagoManual(id: string, professorId: string) {
  const p = await queryOne<{
    id: string;
    aluno_id: string;
    mes_referencia: string | Date;
    status: string;
    professor_id: string;
    usuario_id: string | null;
    aluno_nome: string;
  }>(
    `SELECT p.id, p.aluno_id, p.mes_referencia, p.status,
            t.professor_id, a.usuario_id, a.nome AS aluno_nome
     FROM "Pagamento" p
     JOIN "Turma" t ON t.id = p.turma_id
     JOIN "Aluno" a ON a.id = p.aluno_id
     WHERE p.id = $1`,
    [id],
    { message: "Mensalidade não encontrada" },
  );

  if (p.professor_id !== professorId) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }

  if (p.status === "PAGO") {
    throw new AppError(400, "JA_PAGO", "Mensalidade já está paga");
  }

  const ts = now();

  await execute(`UPDATE "Comprovante" SET ativo = false WHERE pagamento_id = $1`, [id]);

  await execute(
    `UPDATE "Pagamento" SET status = 'PAGO', validado_por_id = $2, validado_em = $3, atualizado_em = $3 WHERE id = $1`,
    [id, professorId, ts],
  );

  if (p.usuario_id) {
    const { criarNotificacao } = await import("../../lib/notificacoes.js");
    const mes = new Date(toIso(p.mes_referencia)).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    await criarNotificacao(
      p.usuario_id,
      "Pagamento confirmado",
      `Sua mensalidade de ${mes} foi confirmada pelo professor.`,
      "PAGAMENTO_CONFIRMADO",
      `/mensalidades/${id}`,
    );
  }

  const { sincronizarBloqueioAluno } = await import("../../lib/inadimplencia.js");
  await sincronizarBloqueioAluno(p.aluno_id);

  return { ok: true };
}

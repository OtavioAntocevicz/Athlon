import {
  execute,
  generateId,
  now,
  query,
  queryOne,
  turmaIdsDoProfessor,
} from "../../lib/db.js";
import {
  getSignedReadUrl,
  removerArquivoStorage,
  uploadComprovanteStorage,
} from "../../lib/storage/index.js";
import { AppError } from "../../middleware/error-handler.js";
import type { UploadComprovanteInput } from "@athlon/shared-types";

const STATUS_ENVIAVEL = ["PENDENTE", "RECUSADO", "ATRASADO"] as const;

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

async function limparArquivoComprovante(
  comprovanteId: string,
  arquivoUrl: string | null | undefined,
) {
  await removerArquivoStorage(arquivoUrl);
  await execute(`UPDATE "Comprovante" SET arquivo_url = NULL WHERE id = $1`, [comprovanteId]);
}

export async function enviarComprovante(
  pagamentoId: string,
  alunoId: string,
  input: UploadComprovanteInput,
) {
  const raw = input.dataBase64.includes(",")
    ? input.dataBase64.split(",").pop()!
    : input.dataBase64;

  let body: Buffer;
  try {
    body = Buffer.from(raw, "base64");
  } catch {
    throw new AppError(400, "INVALID_FILE", "Arquivo inválido");
  }

  const uploaded = await uploadComprovanteStorage(pagamentoId, input.contentType, body);
  return confirmarComprovante(pagamentoId, alunoId, uploaded.arquivoUrl);
}

export async function confirmarComprovante(
  pagamentoId: string,
  alunoId: string,
  arquivoUrl: string,
) {
  const pagamento = await queryOne<{
    id: string;
    aluno_id: string;
    status: string;
  }>(
    `SELECT id, aluno_id, status FROM "Pagamento" WHERE id = $1`,
    [pagamentoId],
    { message: "Mensalidade não encontrada" },
  );

  if (pagamento.aluno_id !== alunoId) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }

  if (!STATUS_ENVIAVEL.includes(pagamento.status as (typeof STATUS_ENVIAVEL)[number])) {
    throw new AppError(400, "INVALID_STATUS", "Mensalidade não pode receber comprovante");
  }

  await execute(`UPDATE "Comprovante" SET ativo = false WHERE pagamento_id = $1`, [pagamentoId]);

  const comprovanteId = generateId();
  const ts = now();

  const comprovante = await queryOne<Record<string, unknown>>(
    `INSERT INTO "Comprovante" (id, pagamento_id, arquivo_url, enviado_em, ativo)
     VALUES ($1, $2, $3, $4, true)
     RETURNING *`,
    [comprovanteId, pagamentoId, arquivoUrl, ts],
  );

  await execute(`UPDATE "Pagamento" SET status = 'EM_ANALISE' WHERE id = $1`, [pagamentoId]);

  return comprovante;
}

export async function filaAprovacao(professorId: string) {
  const turmaIds = await turmaIdsDoProfessor(professorId);
  if (turmaIds.length === 0) return [];

  const pagamentos = await query<{ id: string }>(
    `SELECT id FROM "Pagamento" WHERE status = 'EM_ANALISE' AND turma_id = ANY($1)`,
    [turmaIds],
  );

  const pagamentoIds = pagamentos.map((p) => p.id);
  if (pagamentoIds.length === 0) return [];

  const items = await query<{
    id: string;
    pagamento_id: string;
    enviado_em: string | Date;
    mes_referencia: string | Date;
    valor_centavos: number;
    aluno_nome: string;
    turma_nome: string;
  }>(
    `SELECT c.id, c.pagamento_id, c.enviado_em,
            p.mes_referencia, p.valor_centavos,
            a.nome AS aluno_nome, t.nome AS turma_nome
     FROM "Comprovante" c
     JOIN "Pagamento" p ON p.id = c.pagamento_id
     JOIN "Aluno" a ON a.id = p.aluno_id
     JOIN "Turma" t ON t.id = p.turma_id
     WHERE c.ativo = true AND c.pagamento_id = ANY($1)
     ORDER BY c.enviado_em ASC`,
    [pagamentoIds],
  );

  return items.map((c) => ({
    id: c.id,
    pagamentoId: c.pagamento_id,
    alunoNome: c.aluno_nome,
    turmaNome: c.turma_nome,
    mesReferencia: new Date(toIso(c.mes_referencia)).toISOString(),
    valorCentavos: c.valor_centavos,
    enviadoEm: new Date(toIso(c.enviado_em)).toISOString(),
  }));
}

export async function getComprovante(id: string, professorId: string) {
  const c = await queryOne<{
    id: string;
    pagamento_id: string;
    enviado_em: string | Date;
    arquivo_url: string | null;
    pag_id: string;
    aluno_id: string;
    turma_id: string;
    mes_referencia: string | Date;
    valor_centavos: number;
    vencimento: string | Date | null;
    status: string;
    aluno_nome: string;
    turma_nome: string;
    professor_id: string;
  }>(
    `SELECT c.id, c.pagamento_id, c.enviado_em, c.arquivo_url,
            p.id AS pag_id, p.aluno_id, p.turma_id, p.mes_referencia, p.valor_centavos,
            p.vencimento, p.status,
            a.nome AS aluno_nome, t.nome AS turma_nome, t.professor_id
     FROM "Comprovante" c
     JOIN "Pagamento" p ON p.id = c.pagamento_id
     JOIN "Aluno" a ON a.id = p.aluno_id
     JOIN "Turma" t ON t.id = p.turma_id
     WHERE c.id = $1`,
    [id],
    { message: "Comprovante não encontrado" },
  );

  if (c.professor_id !== professorId) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }

  const { preverDesbloqueioInadimplencia } = await import("../../lib/inadimplencia.js");
  const inadimplencia = await preverDesbloqueioInadimplencia(
    c.aluno_id,
    c.turma_id,
    c.pag_id,
  );

  return {
    id: c.id,
    pagamentoId: c.pagamento_id,
    alunoNome: c.aluno_nome,
    turmaNome: c.turma_nome,
    mesReferencia: new Date(toIso(c.mes_referencia)).toISOString(),
    valorCentavos: c.valor_centavos,
    vencimento: c.vencimento ? new Date(toIso(c.vencimento)).toISOString() : null,
    status: c.status,
    enviadoEm: new Date(toIso(c.enviado_em)).toISOString(),
    arquivoUrl: await getSignedReadUrl(c.arquivo_url),
    inadimplencia,
  };
}

export async function aprovarComprovante(comprovanteId: string, professorId: string) {
  const c = await queryOne<{
    id: string;
    arquivo_url: string | null;
    pag_id: string;
    aluno_id: string;
    professor_id: string;
  }>(
    `SELECT c.id, c.arquivo_url, p.id AS pag_id, p.aluno_id, t.professor_id
     FROM "Comprovante" c
     JOIN "Pagamento" p ON p.id = c.pagamento_id
     JOIN "Turma" t ON t.id = p.turma_id
     WHERE c.id = $1`,
    [comprovanteId],
    { message: "Comprovante não encontrado" },
  );

  if (c.professor_id !== professorId) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }

  const ts = now();

  await execute(
    `UPDATE "Pagamento" SET status = 'PAGO', validado_por_id = $2, validado_em = $3 WHERE id = $1`,
    [c.pag_id, professorId, ts],
  );

  await execute(`UPDATE "Comprovante" SET revisado_em = $2 WHERE id = $1`, [comprovanteId, ts]);

  await limparArquivoComprovante(comprovanteId, c.arquivo_url);

  const pagDetail = await queryOne<{
    mes_referencia: string | Date;
    usuario_id: string | null;
  }>(
    `SELECT p.mes_referencia, a.usuario_id
     FROM "Pagamento" p
     JOIN "Aluno" a ON a.id = p.aluno_id
     WHERE p.id = $1`,
    [c.pag_id],
  );

  if (pagDetail.usuario_id) {
    const { criarNotificacao } = await import("../../lib/notificacoes.js");
    const mes = pagDetail.mes_referencia
      ? new Date(toIso(pagDetail.mes_referencia)).toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })
      : "referência";
    await criarNotificacao(
      pagDetail.usuario_id,
      "Comprovante aprovado",
      `Seu comprovante de pagamento de ${mes} foi aprovado.`,
      "COMPROVANTE_APROVADO",
      `/mensalidades/${c.pag_id}`,
    );
  }

  const { sincronizarBloqueioAluno } = await import("../../lib/inadimplencia.js");
  await sincronizarBloqueioAluno(c.aluno_id);

  return { ok: true };
}

export async function recusarComprovante(
  comprovanteId: string,
  professorId: string,
  motivo: string,
) {
  const c = await queryOne<{
    id: string;
    arquivo_url: string | null;
    pag_id: string;
    professor_id: string;
  }>(
    `SELECT c.id, c.arquivo_url, p.id AS pag_id, t.professor_id
     FROM "Comprovante" c
     JOIN "Pagamento" p ON p.id = c.pagamento_id
     JOIN "Turma" t ON t.id = p.turma_id
     WHERE c.id = $1`,
    [comprovanteId],
    { message: "Comprovante não encontrado" },
  );

  if (c.professor_id !== professorId) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }

  const ts = now();

  await execute(`UPDATE "Pagamento" SET status = 'RECUSADO' WHERE id = $1`, [c.pag_id]);

  await execute(
    `UPDATE "Comprovante" SET revisado_em = $2, motivo_recusa = $3, ativo = false WHERE id = $1`,
    [comprovanteId, ts, motivo],
  );

  await limparArquivoComprovante(comprovanteId, c.arquivo_url);

  const pagDetail = await queryOne<{
    mes_referencia: string | Date | null;
    usuario_id: string | null;
  }>(
    `SELECT p.mes_referencia, a.usuario_id
     FROM "Pagamento" p
     JOIN "Aluno" a ON a.id = p.aluno_id
     WHERE p.id = $1`,
    [c.pag_id],
  );

  if (pagDetail.usuario_id) {
    const { criarNotificacao } = await import("../../lib/notificacoes.js");
    await criarNotificacao(
      pagDetail.usuario_id,
      "Comprovante recusado",
      `Seu comprovante foi recusado. Motivo: ${motivo}. Envie um novo comprovante.`,
      "COMPROVANTE_RECUSADO",
      `/mensalidades/${c.pag_id}`,
    );
  }

  return { ok: true };
}

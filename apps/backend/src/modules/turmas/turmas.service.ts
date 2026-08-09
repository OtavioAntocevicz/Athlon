import {
  countQuery,
  execute,
  generateId,
  now,
  query,
  queryMaybeOne,
  queryOne,
} from "../../lib/db.js";
import {
  criarUploadUrlFotoTurma,
  removerArquivoStorage,
  removerFotoTurmaStorage,
  uploadFotoTurmaStorage,
} from "../../lib/storage/index.js";
import { AppError } from "../../middleware/error-handler.js";
import { gerarCodigoConvite } from "../../lib/utils.js";
import type {
  CreateTurmaInput,
  UpdateTurmaBasicoInput,
  UpdateTurmaInput,
  UploadFotoTurmaInput,
} from "@athlon/shared-types";
import { statusEfetivo } from "../../lib/mensalidade-focus.js";
import { isMesFuturo } from "../../lib/utils.js";
import {
  gerarMensalidadesParaTurma,
  sincronizarVencimentosDaTurma,
} from "../mensalidades/mensalidades.service.js";

type TurmaRow = Record<string, unknown>;

export async function listarTurmas(professorId: string) {
  const turmas = await query<TurmaRow>(
    `SELECT * FROM "Turma" WHERE professor_id = $1 ORDER BY criado_em DESC`,
    [professorId],
  );

  const result = [];
  for (const t of turmas) {
    const totalAlunos = await countQuery(
      `SELECT COUNT(*)::text AS count FROM "MatriculaTurma" WHERE turma_id = $1 AND afastado = false`,
      [t.id],
    );

    result.push({
      id: t.id,
      nome: t.nome,
      modalidade: t.modalidade,
      nivel: t.nivel,
      codigoConvite: t.codigo_convite,
      mensalidadeCentavos: t.mensalidade_centavos,
      diaVencimento: t.dia_vencimento,
      chavePix: t.chave_pix,
      local: t.local,
      horarioInicio: t.horario_inicio,
      horarioFim: t.horario_fim,
      diasTreino: t.dias_treino,
      totalAlunos,
      fotoUrl: (t.foto_url as string | null) ?? null,
      criadoEm: new Date(t.criado_em as string).toISOString(),
    });
  }

  return result;
}

export async function criarTurma(professorId: string, input: CreateTurmaInput) {
  const id = generateId();
  const ts = now();

  let chavePix = input.chavePix?.trim() ?? "";
  if (!chavePix) {
    const prof = await queryMaybeOne<{ chave_pix: string | null }>(
      `SELECT chave_pix FROM "Professor" WHERE id = $1`,
      [professorId],
    );
    chavePix = prof?.chave_pix?.trim() ?? "";
  }
  if (!chavePix) {
    throw new AppError(400, "PIX_REQUIRED", "Chave PIX é obrigatória");
  }

  const turma = await queryOne<TurmaRow>(
    `INSERT INTO "Turma" (
       id, professor_id, nome, modalidade, nivel, mensalidade_centavos,
       dia_vencimento, chave_pix, local, horario_inicio, horario_fim,
       dias_treino, codigo_convite, criado_em, atualizado_em
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    [
      id,
      professorId,
      input.nome,
      input.modalidade,
      input.nivel,
      input.mensalidadeCentavos,
      input.diaVencimento,
      chavePix,
      input.local,
      input.horarioInicio,
      input.horarioFim,
      input.diasTreino ?? null,
      gerarCodigoConvite(),
      ts,
      ts,
    ],
  );

  await gerarMensalidadesParaTurma(turma.id as string);
  return turma;
}

export async function getTurma(id: string, professorId: string) {
  const turma = await queryMaybeOne<TurmaRow>(
    `SELECT * FROM "Turma" WHERE id = $1 AND professor_id = $2`,
    [id, professorId],
  );

  if (!turma) throw new AppError(404, "NOT_FOUND", "Turma não encontrada");

  const totalAlunos = await countQuery(
    `SELECT COUNT(*)::text AS count FROM "MatriculaTurma" WHERE turma_id = $1 AND afastado = false`,
    [id],
  );

  return mapTurmaDetalhe(turma, totalAlunos);
}

export async function atualizarTurmaBasico(
  id: string,
  professorId: string,
  input: UpdateTurmaBasicoInput,
) {
  const existing = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "Turma" WHERE id = $1 AND professor_id = $2`,
    [id, professorId],
  );

  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  const turma = await queryOne<TurmaRow>(
    `UPDATE "Turma" SET
       nome = $1,
       modalidade = $2,
       nivel = $3,
       mensalidade_centavos = $4,
       dia_vencimento = $5,
       chave_pix = $6,
       local = $7,
       horario_inicio = $8,
       horario_fim = $9,
       atualizado_em = $10
     WHERE id = $11
     RETURNING *`,
    [
      input.nome,
      input.modalidade,
      input.nivel,
      input.mensalidadeCentavos,
      input.diaVencimento,
      input.chavePix,
      input.local ?? null,
      input.horarioInicio ?? null,
      input.horarioFim ?? null,
      now(),
      id,
    ],
  );

  await sincronizarVencimentosDaTurma(id);

  const totalAlunos = await countQuery(
    `SELECT COUNT(*)::text AS count FROM "MatriculaTurma" WHERE turma_id = $1 AND afastado = false`,
    [id],
  );

  return mapTurmaDetalhe(turma, totalAlunos);
}

function mapTurmaDetalhe(turma: Record<string, unknown>, totalAlunos: number) {
  return {
    id: turma.id as string,
    nome: turma.nome as string,
    modalidade: turma.modalidade as string,
    nivel: turma.nivel as string,
    codigoConvite: turma.codigo_convite as string,
    mensalidadeCentavos: turma.mensalidade_centavos as number,
    diaVencimento: turma.dia_vencimento as number,
    chavePix: turma.chave_pix as string,
    local: turma.local as string | null,
    horarioInicio: turma.horario_inicio as string | null,
    horarioFim: turma.horario_fim as string | null,
    fotoUrl: (turma.foto_url as string | null) ?? null,
    totalAlunos,
  };
}

export async function atualizarTurma(
  id: string,
  professorId: string,
  input: UpdateTurmaInput,
) {
  const existing = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "Turma" WHERE id = $1 AND professor_id = $2`,
    [id, professorId],
  );

  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const addField = (column: string, value: unknown) => {
    fields.push(`"${column}" = $${idx++}`);
    values.push(value);
  };

  addField("atualizado_em", now());
  if (input.nome !== undefined) addField("nome", input.nome);
  if (input.modalidade !== undefined) addField("modalidade", input.modalidade);
  if (input.nivel !== undefined) addField("nivel", input.nivel);
  if (input.mensalidadeCentavos !== undefined) addField("mensalidade_centavos", input.mensalidadeCentavos);
  if (input.diaVencimento !== undefined) addField("dia_vencimento", input.diaVencimento);
  if (input.chavePix !== undefined) addField("chave_pix", input.chavePix);
  if (input.local !== undefined) addField("local", input.local);
  if (input.horarioInicio !== undefined) addField("horario_inicio", input.horarioInicio);
  if (input.horarioFim !== undefined) addField("horario_fim", input.horarioFim);
  if (input.diasTreino !== undefined) addField("dias_treino", input.diasTreino);

  values.push(id);

  const turma = await queryOne<TurmaRow>(
    `UPDATE "Turma" SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values,
  );

  if (input.diaVencimento !== undefined) {
    await sincronizarVencimentosDaTurma(id);
  }

  return turma;
}

export async function listarAlunosTurma(turmaId: string, professorId: string) {
  const turmaCheck = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "Turma" WHERE id = $1 AND professor_id = $2`,
    [turmaId, professorId],
  );

  if (!turmaCheck) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  const matriculas = await query<{
    matriculado_em: string;
    posicao: string | null;
    numero_camisa: number | null;
    aluno_id: string;
    nome: string;
    sobrenome: string | null;
    rg: string | null;
    telefone: string | null;
    email: string | null;
  }>(
    `SELECT m.matriculado_em, m.posicao, m.numero_camisa,
            a.id AS aluno_id, a.nome, a.sobrenome, a.rg, a.telefone, a.email
     FROM "MatriculaTurma" m
     JOIN "Aluno" a ON a.id = m.aluno_id
     WHERE m.turma_id = $1 AND m.afastado = false`,
    [turmaId],
  );

  const hoje = new Date();
  const result = [];

  for (const m of matriculas) {
    const pagamentos = (
      await query<{ status: string; mes_referencia: string; vencimento: string | null }>(
        `SELECT status, mes_referencia, vencimento
         FROM "Pagamento"
         WHERE aluno_id = $1 AND turma_id = $2
         ORDER BY mes_referencia DESC`,
        [m.aluno_id, turmaId],
      )
    ).filter((p) => !isMesFuturo(p.mes_referencia, hoje));

    const ultimo = pagamentos[0];
    const statusFinanceiro = ultimo ? statusEfetivo(ultimo, hoje) : "PENDENTE";

    result.push({
      id: m.aluno_id,
      nome: m.nome,
      sobrenome: m.sobrenome ?? "",
      rg: m.rg,
      telefone: m.telefone,
      email: m.email,
      numeroCamisa: m.numero_camisa,
      posicao: m.posicao,
      statusFinanceiro,
      matriculadoEm: new Date(m.matriculado_em).toISOString(),
    });
  }

  return result;
}

/** Remove turma e dados vinculados (presenças, eventos, pagamentos, matrículas, storage). */
export async function excluirTurmaCascade(id: string) {
  const turmaCheck = await queryMaybeOne<{ id: string; nome: string; foto_url: string | null }>(
    `SELECT id, nome, foto_url FROM "Turma" WHERE id = $1`,
    [id],
  );

  if (!turmaCheck) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  try {
    await removerFotoTurmaStorage(turmaCheck.foto_url);
  } catch {
    /* ignora falha de storage */
  }

  const eventos = await query<{ id: string }>(
    `SELECT id FROM "Evento" WHERE turma_id = $1`,
    [id],
  );
  const eventoIds = eventos.map((e) => e.id);

  if (eventoIds.length > 0) {
    await execute(`DELETE FROM "Presenca" WHERE evento_id = ANY($1::text[])`, [eventoIds]);
  }

  const pagamentos = await query<{ id: string }>(
    `SELECT id FROM "Pagamento" WHERE turma_id = $1`,
    [id],
  );
  const pagamentoIds = pagamentos.map((p) => p.id);

  if (pagamentoIds.length > 0) {
    const comprovantes = await query<{ arquivo_url: string | null }>(
      `SELECT arquivo_url FROM "Comprovante" WHERE pagamento_id = ANY($1::text[])`,
      [pagamentoIds],
    );

    for (const c of comprovantes) {
      try {
        await removerArquivoStorage(c.arquivo_url);
      } catch {
        /* ignora falha de storage */
      }
    }

    await execute(`DELETE FROM "Comprovante" WHERE pagamento_id = ANY($1::text[])`, [pagamentoIds]);
    await execute(`DELETE FROM "Pagamento" WHERE id = ANY($1::text[])`, [pagamentoIds]);
  }

  await execute(`DELETE FROM "Evento" WHERE turma_id = $1`, [id]);
  await execute(`DELETE FROM "MatriculaTurma" WHERE turma_id = $1`, [id]);
  await execute(`DELETE FROM "Turma" WHERE id = $1`, [id]);

  return { ok: true, nome: turmaCheck.nome };
}

export async function excluirTurma(id: string, professorId: string) {
  const owned = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "Turma" WHERE id = $1 AND professor_id = $2`,
    [id, professorId],
  );

  if (!owned) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  return excluirTurmaCascade(id);
}

export async function criarUploadUrlFoto(
  turmaId: string,
  professorId: string,
  contentType: string,
) {
  const turmaCheck = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "Turma" WHERE id = $1 AND professor_id = $2`,
    [turmaId, professorId],
  );

  if (!turmaCheck) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  return criarUploadUrlFotoTurma(turmaId, contentType);
}

/** Upload via API (evita CORS do R2 no navegador). */
export async function enviarFotoTurma(
  turmaId: string,
  professorId: string,
  input: UploadFotoTurmaInput,
) {
  const turmaCheck = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "Turma" WHERE id = $1 AND professor_id = $2`,
    [turmaId, professorId],
  );

  if (!turmaCheck) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  const raw = input.dataBase64.includes(",")
    ? input.dataBase64.split(",").pop()!
    : input.dataBase64;

  let body: Buffer;
  try {
    body = Buffer.from(raw, "base64");
  } catch {
    throw new AppError(400, "INVALID_FILE", "Arquivo inválido");
  }

  const uploaded = await uploadFotoTurmaStorage(turmaId, input.contentType, body);
  return atualizarFotoTurma(turmaId, professorId, uploaded.fotoUrl);
}

export async function atualizarFotoTurma(
  turmaId: string,
  professorId: string,
  fotoUrl: string,
) {
  const existing = await queryMaybeOne<{ id: string; foto_url: string | null }>(
    `SELECT id, foto_url FROM "Turma" WHERE id = $1 AND professor_id = $2`,
    [turmaId, professorId],
  );

  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Turma não encontrada");
  }

  const antiga = existing.foto_url;

  const turma = await queryOne<TurmaRow>(
    `UPDATE "Turma" SET foto_url = $1, atualizado_em = $2 WHERE id = $3 RETURNING *`,
    [fotoUrl, now(), turmaId],
  );

  if (antiga && antiga !== fotoUrl) {
    try {
      await removerFotoTurmaStorage(antiga);
    } catch {
      /* ignora falha de limpeza - a nova já está salva */
    }
  }

  const totalAlunos = await countQuery(
    `SELECT COUNT(*)::text AS count FROM "MatriculaTurma" WHERE turma_id = $1 AND afastado = false`,
    [turmaId],
  );

  return mapTurmaDetalhe(turma, totalAlunos);
}

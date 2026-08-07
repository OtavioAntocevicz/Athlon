import { execute, generateId, now, query, queryMaybeOne } from "../../lib/db.js";
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
  if (!autor.alunoId && !autor.professorId) return [];

  const rows = autor.alunoId
    ? await query<{
        id: string;
        assunto: string;
        status: string;
        criado_em: string;
        atualizado_em: string;
      }>(
        `SELECT id, assunto, status, criado_em, atualizado_em
         FROM "Chamado"
         WHERE aluno_id = $1
         ORDER BY criado_em DESC`,
        [autor.alunoId],
      )
    : await query<{
        id: string;
        assunto: string;
        status: string;
        criado_em: string;
        atualizado_em: string;
      }>(
        `SELECT id, assunto, status, criado_em, atualizado_em
         FROM "Chamado"
         WHERE professor_id = $1
         ORDER BY criado_em DESC`,
        [autor.professorId!],
      );

  return rows.map((c) => ({
    id: c.id,
    assunto: c.assunto,
    status: c.status,
    criadoEm: new Date(c.criado_em).toISOString(),
    atualizadoEm: new Date(c.atualizado_em).toISOString(),
  }));
}

export async function obterMeuChamado(chamadoId: string, autor: AutorIds) {
  if (!autor.alunoId && !autor.professorId) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }

  const c = autor.alunoId
    ? await queryMaybeOne<Record<string, unknown>>(
        `SELECT * FROM "Chamado" WHERE id = $1 AND aluno_id = $2`,
        [chamadoId, autor.alunoId],
      )
    : await queryMaybeOne<Record<string, unknown>>(
        `SELECT * FROM "Chamado" WHERE id = $1 AND professor_id = $2`,
        [chamadoId, autor.professorId!],
      );

  if (!c) throw new AppError(404, "NOT_FOUND", "Chamado não encontrado");

  const autorTipo: AutorChamado = c.professor_id ? "PROFESSOR" : "ALUNO";
  return mapDetalhe(c, "", autorTipo);
}

export async function criarChamado(autor: AutorIds, input: CriarChamadoInput) {
  if (!autor.alunoId && !autor.professorId) {
    throw new AppError(403, "FORBIDDEN", "Acesso negado");
  }

  const id = generateId();
  const ts = now();

  await execute(
    `INSERT INTO "Chamado"
       (id, aluno_id, professor_id, assunto, mensagem, status, criado_em, atualizado_em)
     VALUES ($1, $2, $3, $4, $5, 'ABERTO', $6, $6)`,
    [
      id,
      autor.alunoId ?? null,
      autor.professorId ?? null,
      input.assunto.trim(),
      input.mensagem.trim(),
      ts,
    ],
  );

  return obterMeuChamado(id, autor);
}

export async function listarChamadosAdmin(status?: string) {
  const rows = status
    ? await query<{
        id: string;
        assunto: string;
        status: string;
        criado_em: string;
        atualizado_em: string;
        aluno_id: string | null;
        professor_id: string | null;
        aluno_nome: string | null;
        aluno_sobrenome: string | null;
        professor_nome: string | null;
      }>(
        `SELECT c.id, c.assunto, c.status, c.criado_em, c.atualizado_em,
                c.aluno_id, c.professor_id,
                a.nome AS aluno_nome, a.sobrenome AS aluno_sobrenome,
                u.nome AS professor_nome
         FROM "Chamado" c
         LEFT JOIN "Aluno" a ON a.id = c.aluno_id
         LEFT JOIN "Professor" pr ON pr.id = c.professor_id
         LEFT JOIN "Usuario" u ON u.id = pr.usuario_id
         WHERE c.status = $1
         ORDER BY c.criado_em DESC`,
        [status],
      )
    : await query<{
        id: string;
        assunto: string;
        status: string;
        criado_em: string;
        atualizado_em: string;
        aluno_id: string | null;
        professor_id: string | null;
        aluno_nome: string | null;
        aluno_sobrenome: string | null;
        professor_nome: string | null;
      }>(
        `SELECT c.id, c.assunto, c.status, c.criado_em, c.atualizado_em,
                c.aluno_id, c.professor_id,
                a.nome AS aluno_nome, a.sobrenome AS aluno_sobrenome,
                u.nome AS professor_nome
         FROM "Chamado" c
         LEFT JOIN "Aluno" a ON a.id = c.aluno_id
         LEFT JOIN "Professor" pr ON pr.id = c.professor_id
         LEFT JOIN "Usuario" u ON u.id = pr.usuario_id
         ORDER BY c.criado_em DESC`,
      );

  return rows.map((c) => {
    const autorTipo: AutorChamado = c.professor_id ? "PROFESSOR" : "ALUNO";
    const autorNome = c.professor_id
      ? (c.professor_nome ?? "Treinador")
      : c.aluno_nome
        ? [c.aluno_nome, c.aluno_sobrenome].filter(Boolean).join(" ")
        : "Aluno";

    return {
      id: c.id,
      assunto: c.assunto,
      status: c.status,
      criadoEm: new Date(c.criado_em).toISOString(),
      atualizadoEm: new Date(c.atualizado_em).toISOString(),
      autorTipo,
      autorNome,
      alunoNome: autorNome,
    };
  });
}

export async function obterChamadoAdmin(chamadoId: string) {
  const c = await queryMaybeOne<
    Record<string, unknown> & {
      aluno_nome: string | null;
      aluno_sobrenome: string | null;
      professor_nome: string | null;
    }
  >(
    `SELECT c.*,
            a.nome AS aluno_nome, a.sobrenome AS aluno_sobrenome,
            u.nome AS professor_nome
     FROM "Chamado" c
     LEFT JOIN "Aluno" a ON a.id = c.aluno_id
     LEFT JOIN "Professor" pr ON pr.id = c.professor_id
     LEFT JOIN "Usuario" u ON u.id = pr.usuario_id
     WHERE c.id = $1`,
    [chamadoId],
  );

  if (!c) throw new AppError(404, "NOT_FOUND", "Chamado não encontrado");

  const autorTipo: AutorChamado = c.professor_id ? "PROFESSOR" : "ALUNO";
  const autorNome = c.professor_id
    ? (c.professor_nome ?? "Treinador")
    : c.aluno_nome
      ? [c.aluno_nome, c.aluno_sobrenome].filter(Boolean).join(" ")
      : "Aluno";

  return mapDetalhe(c, autorNome, autorTipo);
}

export async function responderChamadoAdmin(
  chamadoId: string,
  input: ResponderChamadoInput,
) {
  const existing = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "Chamado" WHERE id = $1`,
    [chamadoId],
  );

  if (!existing) throw new AppError(404, "NOT_FOUND", "Chamado não encontrado");

  const ts = now();
  const status = input.status ?? "RESPONDIDO";

  await execute(
    `UPDATE "Chamado"
     SET resposta_admin = $1, status = $2, respondido_em = $3, atualizado_em = $3
     WHERE id = $4`,
    [input.respostaAdmin.trim(), status, ts, chamadoId],
  );

  return obterChamadoAdmin(chamadoId);
}

import type { Request } from "express";
import { execute, generateId, now, query } from "./db.js";

export type AuditoriaContext = {
  adminUsuarioId: string;
  ip?: string | null;
  userAgent?: string | null;
};

export function auditoriaFromRequest(req: Request): AuditoriaContext {
  return {
    adminUsuarioId: req.user!.sub,
    ip: req.ip ?? req.socket.remoteAddress ?? null,
    userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null,
  };
}

export async function registrarAuditoriaAdmin(
  ctx: AuditoriaContext,
  acao: string,
  entidade?: string | null,
  entidadeId?: string | null,
  detalhes?: Record<string, unknown> | null,
): Promise<void> {
  await execute(
    `INSERT INTO "AuditoriaAdmin"
       (id, admin_usuario_id, acao, entidade, entidade_id, detalhes, ip, user_agent, criado_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      generateId(),
      ctx.adminUsuarioId,
      acao,
      entidade ?? null,
      entidadeId ?? null,
      detalhes ? JSON.stringify(detalhes) : null,
      ctx.ip ?? null,
      ctx.userAgent ?? null,
      now(),
    ],
  );
}

type AuditoriaRow = {
  id: string;
  admin_usuario_id: string;
  admin_nome: string;
  admin_email: string;
  acao: string;
  entidade: string | null;
  entidade_id: string | null;
  detalhes: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  criado_em: string;
};

export async function listarAuditoriaAdmin(opts: {
  page: number;
  limit: number;
  acao?: string;
}) {
  const offset = (opts.page - 1) * opts.limit;
  const params: unknown[] = [opts.limit, offset];
  let where = "";

  if (opts.acao) {
    params.push(opts.acao);
    where = `WHERE a.acao = $${params.length}`;
  }

  const rows = await query<AuditoriaRow>(
    `SELECT a.id, a.admin_usuario_id, u.nome AS admin_nome, u.email AS admin_email,
            a.acao, a.entidade, a.entidade_id, a.detalhes, a.ip, a.user_agent, a.criado_em
     FROM "AuditoriaAdmin" a
     INNER JOIN "Usuario" u ON u.id = a.admin_usuario_id
     ${where}
     ORDER BY a.criado_em DESC
     LIMIT $1 OFFSET $2`,
    params,
  );

  const countParams = opts.acao ? [opts.acao] : [];
  const countWhere = opts.acao ? "WHERE acao = $1" : "";
  const totalRow = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM "AuditoriaAdmin" ${countWhere}`,
    countParams,
  );

  return {
    items: rows.map((r) => ({
      id: r.id,
      adminUsuarioId: r.admin_usuario_id,
      adminNome: r.admin_nome,
      adminEmail: r.admin_email,
      acao: r.acao,
      entidade: r.entidade,
      entidadeId: r.entidade_id,
      detalhes: r.detalhes,
      ip: r.ip,
      userAgent: r.user_agent,
      criadoEm: r.criado_em,
    })),
    total: parseInt(totalRow[0]?.total ?? "0", 10),
    page: opts.page,
    limit: opts.limit,
  };
}

export const AcoesAuditoria = {
  CRIAR_PROFESSOR: "criar_professor",
  ATUALIZAR_STATUS_PROFESSOR: "atualizar_status_professor",
  REENVIAR_CONVITE_PROFESSOR: "reenviar_convite_professor",
  EXCLUIR_PROFESSOR: "excluir_professor",
  EXCLUIR_ALUNO: "excluir_aluno",
  MATRICULAR_ALUNO: "matricular_aluno",
  AFASTAR_ALUNO: "afastar_aluno",
  TROCAR_TURMA: "trocar_turma",
  DESBLOQUEAR_ALUNO: "desbloquear_aluno",
  RESPONDER_CHAMADO: "responder_chamado",
  MFA_HABILITAR: "mfa_habilitar",
  MFA_DESABILITAR: "mfa_desabilitar",
  MFA_BACKUP_CODES_REGENERAR: "mfa_backup_codes_regenerar",
} as const;

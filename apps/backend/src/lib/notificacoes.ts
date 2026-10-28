import {
  sendNotification,
  sendNotificationSemanal,
  sendNotificationIfTypeAbsent,
} from "./notifications/notification.service.js";
import type { NotificationPayload } from "./notifications/types.js";
import { query, queryMaybeOne } from "./db.js";

export async function criarNotificacao(
  usuarioId: string,
  titulo: string,
  corpo: string,
  tipo: string,
  url?: string,
) {
  const payload: NotificationPayload = { titulo, corpo, tipo, url };
  await sendNotification(usuarioId, payload);
}

export async function criarNotificacaoSemanal(
  usuarioId: string,
  titulo: string,
  corpo: string,
  tipo: string,
  url?: string,
) {
  const payload: NotificationPayload = { titulo, corpo, tipo, url };
  await sendNotificationSemanal(usuarioId, payload);
}

export async function criarNotificacaoUnicaPorTipo(
  usuarioId: string,
  titulo: string,
  corpo: string,
  tipo: string,
  url?: string,
) {
  const payload: NotificationPayload = { titulo, corpo, tipo, url };
  await sendNotificationIfTypeAbsent(usuarioId, payload);
}

export async function usuarioIdsPorAlunos(alunoIds: string[]): Promise<Map<string, string>> {
  if (alunoIds.length === 0) return new Map();
  const rows = await query<{ aluno_id: string; usuario_id: string }>(
    `SELECT id AS aluno_id, usuario_id FROM "Aluno"
     WHERE id = ANY($1::text[]) AND usuario_id IS NOT NULL`,
    [alunoIds],
  );
  return new Map(rows.map((r) => [r.aluno_id, r.usuario_id]));
}

export async function usuarioIdDoAluno(alunoId: string): Promise<string | null> {
  const row = await queryMaybeOne<{ usuario_id: string }>(
    `SELECT usuario_id FROM "Aluno" WHERE id = $1`,
    [alunoId],
  );
  return row?.usuario_id ?? null;
}

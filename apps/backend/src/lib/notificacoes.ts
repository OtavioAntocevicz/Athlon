import {
  sendNotification,
  sendNotificationSemanal,
} from "./notifications/notification.service.js";
import type { NotificationPayload } from "./notifications/types.js";
import { queryMaybeOne } from "./db.js";

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

export async function usuarioIdDoAluno(alunoId: string): Promise<string | null> {
  const row = await queryMaybeOne<{ usuario_id: string }>(
    `SELECT usuario_id FROM "Aluno" WHERE id = $1`,
    [alunoId],
  );
  return row?.usuario_id ?? null;
}

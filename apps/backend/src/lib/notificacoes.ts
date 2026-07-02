import {
  sendNotification,
  sendNotificationSemanal,
} from "./notifications/notification.service.js";
import type { NotificationPayload } from "./notifications/types.js";
import { supabase } from "../config/supabase.js";

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
  const result = await supabase
    .from("Aluno")
    .select("usuario_id")
    .eq("id", alunoId)
    .maybeSingle();
  return result.data?.usuario_id ?? null;
}

import { supabase } from "../../config/supabase.js";
import type { NotificationPayload } from "./types.js";
import { inAppProvider } from "./providers/in-app.provider.js";
import { webPushProvider } from "./providers/web-push.provider.js";

const pushProviders = [webPushProvider];

const INTERVALO_SEMANAL_MS = 7 * 24 * 60 * 60 * 1000;

async function notificacaoRecenteExiste(
  usuarioId: string,
  tipo: string,
  intervaloMs = INTERVALO_SEMANAL_MS,
): Promise<boolean> {
  const desde = new Date(Date.now() - intervaloMs).toISOString();
  const { count } = await supabase
    .from("Notificacao")
    .select("*", { count: "exact", head: true })
    .eq("usuario_id", usuarioId)
    .eq("tipo", tipo)
    .gte("criado_em", desde);

  return (count ?? 0) > 0;
}

export async function sendNotification(
  usuarioId: string,
  payload: NotificationPayload,
): Promise<void> {
  await inAppProvider.send(usuarioId, payload);
  await Promise.all(pushProviders.map((p) => p.send(usuarioId, payload)));
}

export async function sendNotificationSemanal(
  usuarioId: string,
  payload: NotificationPayload,
): Promise<void> {
  const existe = await notificacaoRecenteExiste(usuarioId, payload.tipo);
  if (existe) return;
  await sendNotification(usuarioId, payload);
}

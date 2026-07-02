import { supabase } from "../../config/supabase.js";
import { now, throwOnError } from "../../lib/db.js";
import { registrarDispositivo } from "../../lib/devices/device.service.js";
import { PlatformDispositivo, PushProvider } from "@athlon/shared-types";

export async function listarNotificacoes(usuarioId: string) {
  const result = await supabase
    .from("Notificacao")
    .select("*")
    .eq("usuario_id", usuarioId)
    .order("criado_em", { ascending: false })
    .limit(50);

  const items = throwOnError(result);
  return items.map((n) => ({
    id: n.id,
    titulo: n.titulo,
    corpo: n.corpo,
    tipo: n.tipo,
    url: n.url ?? null,
    lida: n.lida,
    criadoEm: new Date(n.criado_em).toISOString(),
  }));
}

export async function contarNaoLidas(usuarioId: string) {
  const { count } = await supabase
    .from("Notificacao")
    .select("*", { count: "exact", head: true })
    .eq("usuario_id", usuarioId)
    .eq("lida", false);

  return count ?? 0;
}

export async function marcarComoLida(id: string, usuarioId: string) {
  const result = await supabase
    .from("Notificacao")
    .update({ lida: true })
    .eq("id", id)
    .eq("usuario_id", usuarioId);

  throwOnError(result);
  return { ok: true };
}

export async function marcarTodasLidas(usuarioId: string) {
  const result = await supabase
    .from("Notificacao")
    .update({ lida: true })
    .eq("usuario_id", usuarioId)
    .eq("lida", false);

  throwOnError(result);
  return { ok: true };
}

/** @deprecated Use POST /dispositivos. Mantido para compatibilidade com PWA. */
export async function registrarPushToken(usuarioId: string, token: string) {
  return registrarDispositivo(usuarioId, {
    platform: PlatformDispositivo.WEB,
    pushProvider: PushProvider.WEB,
    pushToken: token,
    notificationPermission: "granted",
  });
}

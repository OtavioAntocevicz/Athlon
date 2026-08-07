import { countQuery, execute, query } from "../../lib/db.js";
import { registrarDispositivo } from "../../lib/devices/device.service.js";
import { PlatformDispositivo, PushProvider } from "@athlon/shared-types";

type NotificacaoRow = {
  id: string;
  titulo: string;
  corpo: string | null;
  tipo: string | null;
  url: string | null;
  lida: boolean;
  criado_em: string;
};

export async function listarNotificacoes(usuarioId: string) {
  const items = await query<NotificacaoRow>(
    `SELECT id, titulo, corpo, tipo, url, lida, criado_em
     FROM "Notificacao"
     WHERE usuario_id = $1
     ORDER BY criado_em DESC
     LIMIT 50`,
    [usuarioId],
  );

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
  return countQuery(
    `SELECT COUNT(*)::text AS count FROM "Notificacao"
     WHERE usuario_id = $1 AND lida = false`,
    [usuarioId],
  );
}

export async function marcarComoLida(id: string, usuarioId: string) {
  await execute(
    `UPDATE "Notificacao" SET lida = true WHERE id = $1 AND usuario_id = $2`,
    [id, usuarioId],
  );
  return { ok: true };
}

export async function marcarTodasLidas(usuarioId: string) {
  await execute(
    `UPDATE "Notificacao" SET lida = true WHERE usuario_id = $1 AND lida = false`,
    [usuarioId],
  );
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

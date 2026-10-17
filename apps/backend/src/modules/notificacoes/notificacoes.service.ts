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

export async function listarNotificacoes(
  usuarioId: string,
  opts?: { page?: number; limit?: number },
) {
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 50;
  const offset = (page - 1) * limit;

  const items = await query<NotificacaoRow>(
    `SELECT id, titulo, corpo, tipo, url, lida, criado_em
     FROM "Notificacao"
     WHERE usuario_id = $1
     ORDER BY criado_em DESC
     LIMIT $2 OFFSET $3`,
    [usuarioId, limit, offset],
  );

  const total = await countQuery(
    `SELECT COUNT(*)::text AS count FROM "Notificacao" WHERE usuario_id = $1`,
    [usuarioId],
  );

  const mapped = items.map((n) => ({
    id: n.id,
    titulo: n.titulo,
    corpo: n.corpo,
    tipo: n.tipo,
    url: n.url ?? null,
    lida: n.lida,
    criadoEm: new Date(n.criado_em).toISOString(),
  }));

  return { items: mapped, page, limit, total };
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

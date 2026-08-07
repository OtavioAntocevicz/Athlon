import { execute, generateId, now } from "../../db.js";
import type { NotificationPayload, NotificationProvider } from "../types.js";

export const inAppProvider: NotificationProvider = {
  name: "in-app",

  async send(usuarioId: string, payload: NotificationPayload) {
    await execute(
      `INSERT INTO "Notificacao" (id, usuario_id, titulo, corpo, tipo, url, lida, criado_em)
       VALUES ($1, $2, $3, $4, $5, $6, false, $7)`,
      [
        generateId(),
        usuarioId,
        payload.titulo,
        payload.corpo,
        payload.tipo,
        payload.url ?? null,
        now(),
      ],
    );
  },
};

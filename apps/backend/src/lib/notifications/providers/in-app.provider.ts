import { supabase } from "../../../config/supabase.js";
import { generateId, now, throwOnError } from "../../db.js";
import type { NotificationPayload, NotificationProvider } from "../types.js";

export const inAppProvider: NotificationProvider = {
  name: "in-app",

  async send(usuarioId: string, payload: NotificationPayload) {
    throwOnError(
      await supabase.from("Notificacao").insert({
        id: generateId(),
        usuario_id: usuarioId,
        titulo: payload.titulo,
        corpo: payload.corpo,
        tipo: payload.tipo,
        url: payload.url ?? null,
        lida: false,
        criado_em: now(),
      }),
    );
  },
};

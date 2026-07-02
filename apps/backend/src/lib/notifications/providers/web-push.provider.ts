import webpush from "web-push";
import { env } from "../../../config/env.js";
import { listarDispositivosDoUsuario, invalidarDispositivo } from "../../devices/device.service.js";
import type { NotificationPayload, NotificationProvider } from "../types.js";

let vapidConfigured = false;

function ensureVapid(): boolean {
  if (!env.vapidPublicKey || !env.vapidPrivateKey) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(
      env.vapidSubject,
      env.vapidPublicKey,
      env.vapidPrivateKey,
    );
    vapidConfigured = true;
  }
  return true;
}

export const webPushProvider: NotificationProvider = {
  name: "web-push",

  async send(usuarioId: string, payload: NotificationPayload) {
    if (!ensureVapid()) return;

    const dispositivos = await listarDispositivosDoUsuario(usuarioId);
    const webDevices = dispositivos.filter((d) => d.push_provider === "WEB");

    if (!webDevices.length) return;

    const body = JSON.stringify({
      title: payload.titulo,
      body: payload.corpo,
      url: payload.url ?? "/",
    });

    await Promise.all(
      webDevices.map(async (device) => {
        try {
          const subscription = JSON.parse(device.push_token) as import("web-push").PushSubscription;
          await webpush.sendNotification(subscription, body);
        } catch (err: unknown) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            await invalidarDispositivo(device.id);
          }
        }
      }),
    );
  },
};

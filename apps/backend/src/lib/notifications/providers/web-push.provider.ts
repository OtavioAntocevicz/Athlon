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

function parseWebSubscription(token: string): webpush.PushSubscription | null {
  try {
    const parsed = JSON.parse(token) as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (!parsed?.endpoint || !parsed.keys?.p256dh || !parsed.keys?.auth) {
      return null;
    }
    return parsed as webpush.PushSubscription;
  } catch {
    return null;
  }
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
        const subscription = parseWebSubscription(device.push_token);
        if (!subscription) {
          await invalidarDispositivo(device.id);
          return;
        }

        try {
          await webpush.sendNotification(subscription, body, {
            TTL: 60 * 60 * 24,
            urgency: "high",
          });
        } catch (err: unknown) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410 || status === 403) {
            await invalidarDispositivo(device.id);
            return;
          }
          console.error("[web-push] falha ao enviar", status ?? err);
        }
      }),
    );
  },
};

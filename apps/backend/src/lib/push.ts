import webpush from "web-push";
import { supabase } from "../config/supabase.js";
import { env } from "../config/env.js";

let vapidConfigured = false;

function ensureVapid() {
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

export function getVapidPublicKey(): string | null {
  return env.vapidPublicKey;
}

export async function enviarPushUsuario(
  usuarioId: string,
  payload: { title: string; body: string; url?: string },
) {
  if (!ensureVapid()) return;

  const { data: tokens } = await supabase
    .from("TokenPushFcm")
    .select("id, token")
    .eq("usuario_id", usuarioId);

  if (!tokens?.length) return;

  const body = JSON.stringify(payload);
  const staleIds: string[] = [];

  await Promise.all(
    tokens.map(async (row) => {
      try {
        const subscription = JSON.parse(row.token) as import("web-push").PushSubscription;
        await webpush.sendNotification(subscription, body);
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          staleIds.push(row.id);
        }
      }
    }),
  );

  if (staleIds.length > 0) {
    await supabase.from("TokenPushFcm").delete().in("id", staleIds);
  }
}

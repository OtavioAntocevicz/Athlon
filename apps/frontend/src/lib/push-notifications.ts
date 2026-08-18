import { api } from "./api";
import { track } from "./analytics/analytics";
import { PlatformDispositivo, PushProvider } from "@athlon/shared-types";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function registrarDispositivoWeb(subscription: PushSubscription) {
  await api("/dispositivos", {
    method: "POST",
    body: JSON.stringify({
      platform: PlatformDispositivo.WEB,
      pushProvider: PushProvider.WEB,
      pushToken: JSON.stringify(subscription.toJSON()),
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notificationPermission: Notification.permission,
    }),
  });
}

export async function registrarPushNotifications(): Promise<void> {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return;
  }

  const { publicKey } = await api<{ publicKey: string | null }>(
    "/notificacoes/vapid-public-key",
  );
  if (!publicKey) return;

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission === "granted") {
    track("push_permission_granted");
  } else {
    if (permission === "denied") track("push_permission_denied");
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const applicationServerKey = urlBase64ToUint8Array(publicKey);

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  try {
    await registrarDispositivoWeb(subscription);
  } catch {
    await subscription.unsubscribe().catch(() => undefined);
    const nova = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
    await registrarDispositivoWeb(nova);
  }
}

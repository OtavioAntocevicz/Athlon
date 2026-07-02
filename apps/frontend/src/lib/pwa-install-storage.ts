export const PWA_IOS_DISMISS_KEY = "athlon:pwa-ios-dismissed-at";
export const IOS_RESHOW_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export function foiDispensadoRecentemente(now = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(PWA_IOS_DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Date.parse(raw);
    if (Number.isNaN(dismissedAt)) return false;
    return now - dismissedAt < IOS_RESHOW_INTERVAL_MS;
  } catch {
    return false;
  }
}

export function registrarDispensa(at = new Date()): void {
  try {
    localStorage.setItem(PWA_IOS_DISMISS_KEY, at.toISOString());
  } catch {
    // ignore quota / private mode
  }
}

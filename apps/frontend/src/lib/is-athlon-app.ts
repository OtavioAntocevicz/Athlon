declare global {
  interface Window {
    __ATHLON_APP__?: boolean;
  }
}

/** Detecta shell React Native (Play Store) ou WebView dedicada do ATHLON. */
export function isAthlonMobileApp(): boolean {
  if (typeof window === "undefined") return false;
  if (window.__ATHLON_APP__ === true) return true;
  return /AthlonMobile\/\d/i.test(navigator.userAgent);
}

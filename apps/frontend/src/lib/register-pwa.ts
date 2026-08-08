/**
 * Com registerType: "autoUpdate", o SW gerado faz skipWaiting + clientsClaim.
 * Sem reload no controllerchange, o app antigo fica em memória pedindo chunks
 * com hash antigo (404) até um refresh manual — parece que a seção “não abre”.
 */
export function registerPwa(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const register = () => {
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // ignore registration failures (ex.: preview sem SW)
    });
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

/**
 * Com registerType: "autoUpdate", o SW gerado faz skipWaiting + clientsClaim.
 * Em atualizações (não na 1ª instalação), recarregamos para alinhar chunks novos.
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

  // A primeira tomada de controle (install inicial) não deve recarregar a página.
  let hadController = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) {
      hadController = true;
      return;
    }
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

const startedAt = performance.now();

let bootReadyResolver: (() => void) | null = null;
const bootReady = new Promise<void>((resolve) => {
  bootReadyResolver = resolve;
});

/** Chamado quando a sessão inicial (/auth/me) terminou de carregar. */
export function markAppBootReady(): void {
  bootReadyResolver?.();
  bootReadyResolver = null;
}

export function hideBootSplash() {
  const el = document.getElementById("boot-splash");
  if (!el) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const minMs = reducedMotion ? 120 : 700;
  const maxWaitMs = 5000;

  const reveal = () => {
    const wait = Math.max(0, minMs - (performance.now() - startedAt));
    window.setTimeout(() => {
      el.classList.add("is-done");
      const remove = () => el.remove();
      el.addEventListener("transitionend", remove, { once: true });
      window.setTimeout(remove, 500);
    }, wait);
  };

  void Promise.race([
    bootReady,
    new Promise<void>((resolve) => window.setTimeout(resolve, maxWaitMs)),
  ]).then(reveal);
}

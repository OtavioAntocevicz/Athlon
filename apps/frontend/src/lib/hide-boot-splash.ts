const startedAt = performance.now();

export function hideBootSplash() {
  const el = document.getElementById("boot-splash");
  if (!el) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const minMs = reducedMotion ? 150 : 1250;
  const wait = Math.max(0, minMs - (performance.now() - startedAt));

  window.setTimeout(() => {
    el.classList.add("is-done");
    const remove = () => el.remove();
    el.addEventListener("transitionend", remove, { once: true });
    window.setTimeout(remove, 500);
  }, wait);
}

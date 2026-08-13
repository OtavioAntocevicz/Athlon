import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hideBootSplash } from "./hide-boot-splash";

describe("hideBootSplash", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }));
    document.body.innerHTML = `<div id="boot-splash"></div>`;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("não falha se o splash já não existe", () => {
    document.body.innerHTML = "";
    expect(() => hideBootSplash()).not.toThrow();
  });

  it("remove o splash depois do fade", () => {
    vi.useFakeTimers();
    hideBootSplash();
    expect(document.getElementById("boot-splash")).not.toBeNull();
    vi.runAllTimers();
    expect(document.getElementById("boot-splash")).toBeNull();
  });
});

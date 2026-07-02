import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  IOS_RESHOW_INTERVAL_MS,
  PWA_IOS_DISMISS_KEY,
  foiDispensadoRecentemente,
  registrarDispensa,
} from "./pwa-install-storage";

describe("pwa-install-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("retorna false sem registro de dispensa", () => {
    expect(foiDispensadoRecentemente()).toBe(false);
  });

  it("retorna true após dispensar recentemente", () => {
    registrarDispensa(new Date("2026-06-24T12:00:00Z"));
    const now = Date.parse("2026-06-24T13:00:00Z");
    expect(foiDispensadoRecentemente(now)).toBe(true);
  });

  it("permite reexibir após intervalo de 7 dias", () => {
    registrarDispensa(new Date("2026-06-01T12:00:00Z"));
    const now = Date.parse("2026-06-24T12:00:00Z");
    expect(now - Date.parse("2026-06-01T12:00:00Z")).toBeGreaterThan(IOS_RESHOW_INTERVAL_MS);
    expect(foiDispensadoRecentemente(now)).toBe(false);
  });

  it("grava timestamp ISO no localStorage", () => {
    const at = new Date("2026-06-24T10:00:00Z");
    registrarDispensa(at);
    expect(localStorage.getItem(PWA_IOS_DISMISS_KEY)).toBe(at.toISOString());
  });
});

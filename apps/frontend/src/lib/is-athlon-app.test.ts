import { describe, expect, it, afterEach } from "vitest";
import { isAthlonMobileApp } from "./is-athlon-app";

describe("isAthlonMobileApp", () => {
  afterEach(() => {
    delete (window as Window & { __ATHLON_APP__?: boolean }).__ATHLON_APP__;
  });

  it("detecta flag injetada pelo app nativo", () => {
    window.__ATHLON_APP__ = true;
    expect(isAthlonMobileApp()).toBe(true);
  });

  it("detecta sufixo no user agent", () => {
    const original = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: `${original} AthlonMobile/1.0`,
    });
    expect(isAthlonMobileApp()).toBe(true);
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: original,
    });
  });

  it("retorna false no browser comum", () => {
    expect(isAthlonMobileApp()).toBe(false);
  });
});

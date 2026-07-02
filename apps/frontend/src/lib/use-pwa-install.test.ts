import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  detectEhIOS,
  detectEhIOSNaoSafari,
  detectEhSafariIOS,
  detectJaInstalado,
} from "./use-pwa-install";

describe("use-pwa-install (detecção)", () => {
  const originalUserAgent = navigator.userAgent;
  const originalStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: originalUserAgent,
    });
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: originalStandalone,
    });
  });

  it("detecta iOS via userAgent", () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    expect(detectEhIOS()).toBe(true);
  });

  it("não detecta Android como iOS", () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Linux; Android 14)",
    });
    expect(detectEhIOS()).toBe(false);
  });

  it("detecta Safari no iOS", () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });
    expect(detectEhSafariIOS()).toBe(true);
    expect(detectEhIOSNaoSafari()).toBe(false);
  });

  it("detecta Chrome no iOS como não-Safari", () => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1",
    });
    expect(detectEhSafariIOS()).toBe(false);
    expect(detectEhIOSNaoSafari()).toBe(true);
  });

  it("detecta modo standalone via display-mode", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
      media: "(display-mode: standalone)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as MediaQueryList);

    expect(detectJaInstalado()).toBe(true);
  });

  it("detecta modo standalone no iOS via navigator.standalone", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: false,
      media: "(display-mode: standalone)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as MediaQueryList);

    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: true,
    });

    expect(detectJaInstalado()).toBe(true);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "./api";
import { track } from "./analytics/analytics";
import { registrarPushNotifications } from "./push-notifications";

vi.mock("./api", () => ({
  api: vi.fn(),
}));

vi.mock("./analytics/analytics", () => ({
  track: vi.fn(),
}));

describe("push-notifications", () => {
  beforeEach(() => {
    vi.mocked(api).mockReset();
    vi.mocked(track).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("não registra sem service worker ou PushManager", async () => {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });

    await registrarPushNotifications();

    expect(api).not.toHaveBeenCalled();
  });

  it("aborta registro web sem chave VAPID", async () => {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {},
    });
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: class {},
    });

    vi.mocked(api).mockResolvedValue({ publicKey: null });

    await registrarPushNotifications();

    expect(api).toHaveBeenCalledWith("/notificacoes/vapid-public-key");
    expect(api).toHaveBeenCalledTimes(1);
  });
});

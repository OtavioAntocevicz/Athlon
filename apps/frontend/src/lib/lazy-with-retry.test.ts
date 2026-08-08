import { afterEach, describe, expect, it, vi } from "vitest";
import { clearChunkReloadFlag, importWithRetry } from "./lazy-with-retry";

describe("importWithRetry", () => {
  afterEach(() => {
    clearChunkReloadFlag();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("retorna o módulo na primeira tentativa", async () => {
    const mod = { ok: true };
    await expect(importWithRetry(async () => mod)).resolves.toBe(mod);
  });

  it("repete após falha transitória", async () => {
    const mod = { ok: true };
    const factory = vi
      .fn<() => Promise<typeof mod>>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(mod);

    await expect(importWithRetry(factory, 2)).resolves.toBe(mod);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("não trata TypeError genérico como chunk stale", async () => {
    const error = new TypeError("Network down");
    await expect(
      importWithRetry(async () => {
        throw error;
      }, 0),
    ).rejects.toBe(error);
  });

  it("recarrega a página uma vez em falha de chunk", async () => {
    vi.useFakeTimers();
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });

    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    });

    const error = new Error("Failed to fetch dynamically imported module");
    error.name = "ChunkLoadError";

    const pending = importWithRetry(async () => {
      throw error;
    }, 0);

    await vi.waitFor(() => {
      expect(reload).toHaveBeenCalledTimes(1);
    });

    const assertion = expect(pending).rejects.toThrow("Falha ao carregar módulo da aplicação");
    await vi.advanceTimersByTimeAsync(2600);
    await assertion;
  });
});

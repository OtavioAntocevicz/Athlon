import { afterEach, describe, expect, it, vi } from "vitest";
import { clearChunkReloadFlag, importWithRetry } from "./lazy-with-retry";

describe("importWithRetry", () => {
  afterEach(() => {
    clearChunkReloadFlag();
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

  it("recarrega a página uma vez em falha de chunk", async () => {
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

    // promise fica pendente enquanto a página recarrega
    void pending;
  });
});

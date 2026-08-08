import { lazy, type ComponentType, type LazyExoticComponent } from "react";

const CHUNK_RELOAD_KEY = "athlon:chunk-reload";

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    error.name === "ChunkLoadError" ||
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("importing a module script failed") ||
    message.includes("loading chunk") ||
    message.includes("loading css chunk")
  );
}

/** Evita loop infinito de reload quando o chunk continua falhando. */
export function clearChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    // ignore
  }
}

async function reloadOnceForStaleChunk(): Promise<never> {
  try {
    if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
      window.location.reload();
      // Se o reload não ocorrer (ex.: PWA bloqueado), não prende o Suspense para sempre.
      await new Promise((resolve) => setTimeout(resolve, 2500));
      throw new Error("Falha ao carregar módulo da aplicação");
    }
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Falha ao carregar")) {
      throw error;
    }
    window.location.reload();
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  throw new Error("Falha ao carregar módulo da aplicação");
}

export async function importWithRetry<T>(
  factory: () => Promise<T>,
  retries = 2,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const mod = await factory();
      clearChunkReloadFlag();
      return mod;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        continue;
      }
    }
  }

  if (isChunkLoadError(lastError)) {
    await reloadOnceForStaleChunk();
  }

  throw lastError;
}

export function lazyNamed(
  factory: () => Promise<Record<string, ComponentType<any>>>,
  name: string,
): LazyExoticComponent<ComponentType<any>> {
  return lazy(async () => {
    const mod = await importWithRetry(factory);
    const component = mod[name];
    if (!component) {
      throw new Error(`Export "${name}" não encontrado no módulo lazy`);
    }
    return { default: component };
  });
}

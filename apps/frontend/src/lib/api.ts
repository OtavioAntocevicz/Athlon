import { notifySessionLost } from "./session-events";

const API_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

const USER_STORAGE_KEY = "athlon_user";

/** Remove tokens legados do localStorage (migração para cookies httpOnly). */
function clearLegacyTokens() {
  localStorage.removeItem("athlon_token");
  localStorage.removeItem("athlon_refresh");
}

clearLegacyTokens();

export function clearSession() {
  clearLegacyTokens();
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function getStoredUser(): import("@athlon/shared-types").AuthUser | null {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as import("@athlon/shared-types").AuthUser;
  } catch {
    clearSession();
  }
  return null;
}

export function storeUser(user: import("@athlon/shared-types").AuthUser) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function getErrorMessage(error: unknown, fallback = "Erro na requisição"): string {
  if (!(error instanceof Error)) return fallback;
  const msg = error.message;
  if (
    msg.includes("JSON.parse") ||
    msg.includes("Unexpected token") ||
    msg.includes("unexpected character")
  ) {
    return "Não foi possível conectar à API. Verifique se o servidor está no ar e as variáveis de ambiente na Vercel.";
  }
  return msg || fallback;
}

function isPublicAuthPath(path: string): boolean {
  return (
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/register") ||
    path === "/auth/refresh" ||
    path.startsWith("/auth/recuperar-senha")
  );
}

/** Rotas em que 401 é esperado e não deve disparar redirect (evita loop em /login). */
function isSilentAuthPath(path: string): boolean {
  return path === "/auth/me" || path === "/auth/logout";
}

async function readJsonBody(res: Response): Promise<unknown | null> {
  const text = await res.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function messageFromJson(json: unknown, fallback: string): string {
  if (!json || typeof json !== "object") return fallback;

  const body = json as { error?: { message?: string }; message?: string };
  if (typeof body.error?.message === "string" && body.error.message.trim()) {
    return body.error.message;
  }
  if (typeof body.message === "string" && body.message.trim()) {
    return body.message;
  }
  return fallback;
}

async function parseErrorMessage(res: Response): Promise<string> {
  const json = await readJsonBody(res);
  if (json) {
    return messageFromJson(json, "Erro na requisição");
  }

  if (res.status >= 500) {
    return "Servidor indisponível. Tente novamente em instantes.";
  }
  if (res.status === 404) {
    return "Serviço não encontrado. Verifique a configuração da API.";
  }
  return "Não foi possível conectar ao servidor. Tente novamente.";
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    throw new Error("Sem conexão com o servidor. Verifique sua internet e tente novamente.");
  }

  if (
    res.status === 401 &&
    !isPublicAuthPath(path) &&
    !isSilentAuthPath(path)
  ) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return api(path, options);
    }
    clearSession();
    notifySessionLost();
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    if (path.startsWith("/auth/login") && res.status === 401) {
      clearSession();
    }
    throw new Error(message);
  }

  const json = await readJsonBody(res);
  if (!json || typeof json !== "object" || !("data" in json)) {
    throw new Error("Resposta inválida do servidor. Tente novamente.");
  }

  return (json as { data: T }).data;
}

export async function logoutApi(): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // encerra sessão local mesmo se a API falhar
  } finally {
    clearSession();
  }
}

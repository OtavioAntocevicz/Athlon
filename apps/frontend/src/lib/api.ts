const API_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

function getToken(): string | null {
  return localStorage.getItem("athlon_token");
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem("athlon_token", accessToken);
  localStorage.setItem("athlon_refresh", refreshToken);
}

export function clearTokens() {
  localStorage.removeItem("athlon_token");
  localStorage.removeItem("athlon_refresh");
  localStorage.removeItem("athlon_user");
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
    path === "/auth/refresh"
  );
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

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error("Sem conexão com o servidor. Verifique sua internet e tente novamente.");
  }

  if (res.status === 401 && !isPublicAuthPath(path)) {
    const refresh = localStorage.getItem("athlon_refresh");
    if (refresh) {
      try {
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: refresh }),
        });
        if (refreshRes.ok) {
          const refreshJson = await readJsonBody(refreshRes);
          const data = (refreshJson as { data?: { accessToken: string; refreshToken: string } })
            ?.data;
          if (data?.accessToken && data.refreshToken) {
            setTokens(data.accessToken, data.refreshToken);
            return api(path, options);
          }
        }
      } catch {
        // segue para limpar sessão abaixo
      }
      clearTokens();
      window.location.href = "/login";
      throw new Error("Sessão expirada. Faça login novamente.");
    }
  }

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    if (path.startsWith("/auth/login") && res.status === 401) {
      clearTokens();
    }
    throw new Error(message);
  }

  const json = await readJsonBody(res);
  if (!json || typeof json !== "object" || !("data" in json)) {
    throw new Error("Resposta inválida do servidor. Tente novamente.");
  }

  return (json as { data: T }).data;
}

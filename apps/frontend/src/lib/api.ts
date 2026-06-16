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

function isPublicAuthPath(path: string): boolean {
  return (
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/register") ||
    path === "/auth/refresh"
  );
}

async function parseErrorMessage(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    if (res.status >= 500) {
      return "Servidor indisponível. Tente novamente em instantes.";
    }
    if (res.status === 404) {
      return "Serviço não encontrado. Verifique a configuração da API.";
    }
    return "Não foi possível conectar ao servidor. Tente novamente.";
  }

  try {
    const json = (await res.json()) as {
      error?: { message?: string };
      message?: string;
    };
    if (typeof json.error?.message === "string" && json.error.message.trim()) {
      return json.error.message;
    }
    if (typeof json.message === "string" && json.message.trim()) {
      return json.message;
    }
  } catch {
    return "Resposta inválida do servidor. Tente novamente.";
  }

  return "Erro na requisição";
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
          const refreshJson = (await refreshRes.json()) as {
            data?: { accessToken: string; refreshToken: string };
          };
          if (refreshJson.data) {
            setTokens(refreshJson.data.accessToken, refreshJson.data.refreshToken);
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

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("Resposta inválida do servidor. Tente novamente.");
  }

  let json: { data?: T };
  try {
    json = (await res.json()) as { data?: T };
  } catch {
    throw new Error("Resposta inválida do servidor. Tente novamente.");
  }

  return json.data as T;
}

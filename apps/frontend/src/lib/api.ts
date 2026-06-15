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

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    const refresh = localStorage.getItem("athlon_refresh");
    if (refresh) {
      try {
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: refresh }),
        });
        if (refreshRes.ok) {
          const { data } = await refreshRes.json();
          setTokens(data.accessToken, data.refreshToken);
          return api(path, options);
        }
      } catch {
        clearTokens();
        window.location.href = "/login";
      }
    }
  }

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message ?? "Erro na requisição");
  }
  return json.data;
}

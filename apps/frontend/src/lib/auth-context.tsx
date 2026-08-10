import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { AuthUser, AuthTokens } from "@athlon/shared-types";
import { api, setTokens, clearTokens } from "./api";
import { track } from "./analytics/analytics";
import { preloadPostLoginDestination } from "./preload-post-login";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (tokens: AuthTokens) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem("athlon_user");
    const token = localStorage.getItem("athlon_token");
    if (stored && token) {
      return JSON.parse(stored) as AuthUser;
    }
  } catch {
    clearTokens();
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);
  const isLoading = false;

  useEffect(() => {
    const token = localStorage.getItem("athlon_token");
    const stored = localStorage.getItem("athlon_user");
    if (!stored || !token) return;

    api<AuthUser>("/auth/me")
      .then((me) => {
        setUser(me);
        localStorage.setItem("athlon_user", JSON.stringify(me));
      })
      .catch(() => {
        clearTokens();
        setUser(null);
      });
  }, []);

  const login = (tokens: AuthTokens) => {
    setTokens(tokens.accessToken, tokens.refreshToken);
    localStorage.setItem("athlon_user", JSON.stringify(tokens.user));
    setUser(tokens.user);
    preloadPostLoginDestination(tokens.user);
    track("login", { perfil: tokens.user.perfil });
  };

  const logout = () => {
    track("logout");
    clearTokens();
    setUser(null);
  };

  const refreshUser = async () => {
    const me = await api<AuthUser>("/auth/me");
    setUser(me);
    localStorage.setItem("athlon_user", JSON.stringify(me));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

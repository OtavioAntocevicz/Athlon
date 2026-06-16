import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { AuthUser, AuthTokens } from "@athlon/shared-types";
import { api, setTokens, clearTokens } from "./api";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (tokens: AuthTokens) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("athlon_user");
    const token = localStorage.getItem("athlon_token");
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        clearTokens();
        setIsLoading(false);
        return;
      }
      api<AuthUser>("/auth/me")
        .then(setUser)
        .catch(() => {
          clearTokens();
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = (tokens: AuthTokens) => {
    setTokens(tokens.accessToken, tokens.refreshToken);
    localStorage.setItem("athlon_user", JSON.stringify(tokens.user));
    setUser(tokens.user);
  };

  const logout = () => {
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

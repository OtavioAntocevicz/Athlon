import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { AuthUser, AuthSession } from "@athlon/shared-types";
import { api, clearSession, getStoredUser, logoutApi, storeUser } from "./api";
import { track } from "./analytics/analytics";
import { preloadPostLoginDestination } from "./preload-post-login";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (session: AuthSession) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api<AuthUser>("/auth/me")
      .then((me) => {
        setUser(me);
        storeUser(me);
      })
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = (session: AuthSession) => {
    storeUser(session.user);
    setUser(session.user);
    preloadPostLoginDestination(session.user);
    track("login", { perfil: session.user.perfil });
  };

  const logout = async () => {
    track("logout");
    await logoutApi();
    setUser(null);
  };

  const refreshUser = async () => {
    const me = await api<AuthUser>("/auth/me");
    setUser(me);
    storeUser(me);
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

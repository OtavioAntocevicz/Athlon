import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { AuthUser, AuthSession } from "@athlon/shared-types";
import { api, clearSession, logoutApi, storeUser } from "./api";
import { track } from "./analytics/analytics";
import { preloadPostLoginDestination } from "./preload-post-login";
import { markAppBootReady } from "./hide-boot-splash";
import { setSessionLostHandler } from "./session-events";
import { registrarPushNotifications } from "./push-notifications";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (session: AuthSession) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSessionLostHandler(() => setUser(null));
    return () => setSessionLostHandler(null);
  }, []);

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
      .finally(() => {
        setIsLoading(false);
        markAppBootReady();
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.perfil !== "ALUNO" && user.perfil !== "PROFESSOR") return;
    registrarPushNotifications().catch(() => {
      /* permissão negada ou push indisponível */
    });
  }, [user]);

  const login = async (session: AuthSession) => {
    if (session.requiresMfa) return;

    storeUser(session.user);
    setUser(session.user);

    try {
      const me = await api<AuthUser>("/auth/me");
      setUser(me);
      storeUser(me);
      preloadPostLoginDestination(me);
      track("login", { perfil: me.perfil });
    } catch {
      clearSession();
      setUser(null);
      throw new Error("Não foi possível validar a sessão. Tente novamente.");
    }
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

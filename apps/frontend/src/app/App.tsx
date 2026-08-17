import type { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { PwaInstallPrompt } from "@/components/pwa/PwaInstallPrompt";
import { AppRouter } from "./router";
import { AlunoEmailGate } from "./guards";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 90_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/** Enquanto a sessão inicial carrega, o boot splash do index.html cobre a tela. */
function AuthGate({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth();
  if (isLoading) return null;
  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AuthGate>
            <AlunoEmailGate>
              <AppRouter />
            </AlunoEmailGate>
          </AuthGate>
          <PwaInstallPrompt />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

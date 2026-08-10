import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth-context";
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

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AlunoEmailGate>
            <AppRouter />
          </AlunoEmailGate>
          <PwaInstallPrompt />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
